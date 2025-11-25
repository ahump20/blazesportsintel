/**
 * Cloudflare Pages Function: Live Scores API
 * Multi-source data: KV Cache (ESPN cron) -> SportsDataIO -> Demo fallback
 *
 * Endpoint: /api/scores/:league
 * Methods: GET
 */

interface Env {
  SPORTS_CACHE?: KVNamespace;
  SPORTSDATAIO_API_KEY?: string;
}

interface GameScore {
  gameId: string;
  status: 'live' | 'final' | 'scheduled';
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo: string;
  };
  period: string;
  venue: string;
  startTime: string;
  lastUpdate: string;
}

interface ScoresResponse {
  ok: boolean;
  league: string;
  games: GameScore[];
  cached: boolean;
  lastUpdate: string;
  dataSource: string;
}

interface CachedESPNData {
  data: any;
  fetchedAt: string;
  source: string;
}

// League configuration
const LEAGUE_CONFIG: Record<string, { name: string; sportsDataPath: string }> = {
  mlb: { name: 'MLB', sportsDataPath: 'mlb/scores/json/GamesByDate' },
  nfl: { name: 'NFL', sportsDataPath: 'nfl/scores/json/ScoresByWeek' },
  nba: { name: 'NBA', sportsDataPath: 'nba/scores/json/GamesByDate' },
  ncaa: { name: 'NCAA Football', sportsDataPath: 'cfb/scores/json/GamesByWeek' },
  'college-baseball': { name: 'College Baseball', sportsDataPath: '' },
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const league = (params.league as string)?.toLowerCase();

  // Validate league
  if (!league || !LEAGUE_CONFIG[league]) {
    return jsonResponse({
      ok: false,
      error: 'Invalid league. Supported: mlb, nfl, nba, ncaa, college-baseball',
      availableLeagues: Object.keys(LEAGUE_CONFIG)
    }, 400);
  }

  const config = LEAGUE_CONFIG[league];

  // Strategy 1: Check KV cache from ESPN cron worker
  if (env.SPORTS_CACHE) {
    const cached = await env.SPORTS_CACHE.get(`espn:${league}:scores`, 'json') as CachedESPNData | null;
    if (cached?.data) {
      const games = transformESPNScores(cached.data);
      return jsonResponse({
        ok: true,
        league: config.name,
        games,
        cached: true,
        lastUpdate: cached.fetchedAt,
        dataSource: 'ESPN (cached)',
      }, 200, { 'X-Cache': 'HIT', 'X-Source': 'espn-cache' });
    }
  }

  // Strategy 2: Try SportsDataIO API
  if (env.SPORTSDATAIO_API_KEY && config.sportsDataPath) {
    try {
      const games = await fetchSportsDataIO(env.SPORTSDATAIO_API_KEY, league, config.sportsDataPath);
      if (games.length > 0) {
        // Cache the result
        if (env.SPORTS_CACHE) {
          await env.SPORTS_CACHE.put(`sportsdata:${league}`, JSON.stringify({
            games,
            fetchedAt: new Date().toISOString(),
          }), { expirationTtl: 120 });
        }

        return jsonResponse({
          ok: true,
          league: config.name,
          games,
          cached: false,
          lastUpdate: new Date().toISOString(),
          dataSource: 'SportsDataIO',
        }, 200, { 'X-Cache': 'MISS', 'X-Source': 'sportsdata' });
      }
    } catch (error) {
      console.error(`SportsDataIO error for ${league}:`, error);
    }
  }

  // Strategy 3: Check SportsDataIO cache
  if (env.SPORTS_CACHE) {
    const sdCache = await env.SPORTS_CACHE.get(`sportsdata:${league}`, 'json') as any;
    if (sdCache?.games) {
      return jsonResponse({
        ok: true,
        league: config.name,
        games: sdCache.games,
        cached: true,
        lastUpdate: sdCache.fetchedAt,
        dataSource: 'SportsDataIO (cached)',
      }, 200, { 'X-Cache': 'HIT', 'X-Source': 'sportsdata-cache' });
    }
  }

  // Strategy 4: Return fallback demo data
  return jsonResponse({
    ok: true,
    league: config.name,
    games: getFallbackScores(league),
    cached: false,
    lastUpdate: new Date().toISOString(),
    dataSource: 'Demo (live data unavailable)',
  }, 200, { 'X-Cache': 'MISS', 'X-Source': 'fallback' });
};

async function fetchSportsDataIO(apiKey: string, league: string, path: string): Promise<GameScore[]> {
  const today = new Date().toISOString().split('T')[0];
  let url: string;

  if (league === 'nfl' || league === 'ncaa') {
    // NFL/NCAAF use week-based endpoints
    url = `https://api.sportsdata.io/v3/${path}/2025REG/12?key=${apiKey}`;
  } else {
    url = `https://api.sportsdata.io/v3/${path}/${today}?key=${apiKey}`;
  }

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`SportsDataIO API error: ${response.status}`);
  }

  const data = await response.json() as any[];
  return transformSportsDataIO(data, league);
}

function transformSportsDataIO(data: any[], league: string): GameScore[] {
  if (!Array.isArray(data)) return [];

  return data.slice(0, 12).map((game: any) => {
    const homeAbbr = game.HomeTeam || game.HomeTeamKey || 'HOME';
    const awayAbbr = game.AwayTeam || game.AwayTeamKey || 'AWAY';

    let status: 'live' | 'final' | 'scheduled' = 'scheduled';
    if (game.Status === 'InProgress' || game.Status === 'Live') status = 'live';
    else if (game.Status === 'Final' || game.Status === 'F' || game.Status === 'F/OT') status = 'final';

    let period = '';
    if (league === 'mlb') {
      period = game.Inning ? `${game.InningHalf || 'Bot'} ${game.Inning}` : '';
    } else if (league === 'nfl' || league === 'ncaa') {
      period = game.Quarter ? `Q${game.Quarter}` : '';
    } else if (league === 'nba') {
      period = game.Quarter ? `Q${game.Quarter}` : '';
    }

    if (status === 'final') period = 'Final';

    return {
      gameId: String(game.GameID || game.GameKey || Math.random()),
      status,
      homeTeam: {
        name: game.HomeTeamName || game.HomeTeam || 'Home',
        abbreviation: homeAbbr,
        score: game.HomeTeamScore ?? game.HomeScore ?? 0,
        logo: '',
      },
      awayTeam: {
        name: game.AwayTeamName || game.AwayTeam || 'Away',
        abbreviation: awayAbbr,
        score: game.AwayTeamScore ?? game.AwayScore ?? 0,
        logo: '',
      },
      period,
      venue: game.Stadium?.Name || game.StadiumName || 'TBD',
      startTime: game.DateTime || game.Day || new Date().toISOString(),
      lastUpdate: game.Updated || new Date().toISOString(),
    };
  });
}

function transformESPNScores(data: any): GameScore[] {
  if (!data?.events || !Array.isArray(data.events)) return [];

  return data.events.slice(0, 12).map((event: any) => {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const homeTeamData = competition.competitors?.find((c: any) => c.homeAway === 'home');
    const awayTeamData = competition.competitors?.find((c: any) => c.homeAway === 'away');

    if (!homeTeamData || !awayTeamData) return null;

    let status: 'live' | 'final' | 'scheduled' = 'scheduled';
    const statusType = competition.status?.type?.name || event.status?.type?.name;

    if (statusType === 'STATUS_IN_PROGRESS' || statusType === 'STATUS_HALFTIME') {
      status = 'live';
    } else if (statusType === 'STATUS_FINAL' || statusType === 'STATUS_FINAL_OT') {
      status = 'final';
    }

    const period = competition.status?.type?.shortDetail || event.status?.type?.shortDetail || '';

    return {
      gameId: event.id || String(Math.random()),
      status,
      homeTeam: {
        name: homeTeamData.team?.displayName || homeTeamData.team?.name || 'Home',
        abbreviation: homeTeamData.team?.abbreviation || 'HOME',
        score: parseInt(homeTeamData.score || '0', 10),
        logo: homeTeamData.team?.logo || '',
      },
      awayTeam: {
        name: awayTeamData.team?.displayName || awayTeamData.team?.name || 'Away',
        abbreviation: awayTeamData.team?.abbreviation || 'AWAY',
        score: parseInt(awayTeamData.score || '0', 10),
        logo: awayTeamData.team?.logo || '',
      },
      period,
      venue: competition.venue?.fullName || event.venue?.fullName || 'TBD',
      startTime: event.date || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };
  }).filter(Boolean) as GameScore[];
}

function getFallbackScores(league: string): GameScore[] {
  const fallback: Record<string, GameScore[]> = {
    mlb: [{
      gameId: 'demo-mlb-1', status: 'scheduled',
      homeTeam: { name: 'St. Louis Cardinals', abbreviation: 'STL', score: 0, logo: '' },
      awayTeam: { name: 'Houston Astros', abbreviation: 'HOU', score: 0, logo: '' },
      period: 'Spring Training Feb 2025', venue: 'Busch Stadium',
      startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
    }],
    nfl: [
      {
        gameId: 'demo-nfl-1', status: 'final',
        homeTeam: { name: 'Houston Texans', abbreviation: 'HOU', score: 23, logo: '' },
        awayTeam: { name: 'Buffalo Bills', abbreviation: 'BUF', score: 19, logo: '' },
        period: 'Final', venue: 'NRG Stadium',
        startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
      },
      {
        gameId: 'demo-nfl-2', status: 'final',
        homeTeam: { name: 'Chicago Bears', abbreviation: 'CHI', score: 31, logo: '' },
        awayTeam: { name: 'Pittsburgh Steelers', abbreviation: 'PIT', score: 28, logo: '' },
        period: 'Final', venue: 'Soldier Field',
        startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
      },
      {
        gameId: 'demo-nfl-3', status: 'scheduled',
        homeTeam: { name: 'Tennessee Titans', abbreviation: 'TEN', score: 0, logo: '' },
        awayTeam: { name: 'Houston Texans', abbreviation: 'HOU', score: 0, logo: '' },
        period: 'Sun 12:00 PM CT', venue: 'Nissan Stadium',
        startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
      }
    ],
    nba: [{
      gameId: 'demo-nba-1', status: 'scheduled',
      homeTeam: { name: 'Memphis Grizzlies', abbreviation: 'MEM', score: 0, logo: '' },
      awayTeam: { name: 'San Antonio Spurs', abbreviation: 'SAS', score: 0, logo: '' },
      period: 'Tonight 7:00 PM CT', venue: 'FedExForum',
      startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
    }],
    ncaa: [{
      gameId: 'demo-ncaa-1', status: 'final',
      homeTeam: { name: 'Texas Longhorns', abbreviation: 'TEX', score: 35, logo: '' },
      awayTeam: { name: 'Kentucky Wildcats', abbreviation: 'UK', score: 13, logo: '' },
      period: 'Final', venue: 'DKR-Texas Memorial Stadium',
      startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
    }],
    'college-baseball': [{
      gameId: 'demo-cbb-1', status: 'scheduled',
      homeTeam: { name: 'Texas Longhorns', abbreviation: 'TEX', score: 0, logo: '' },
      awayTeam: { name: 'LSU Tigers', abbreviation: 'LSU', score: 0, logo: '' },
      period: 'Season starts Feb 2025', venue: 'UFCU Disch-Falk Field',
      startTime: new Date().toISOString(), lastUpdate: new Date().toISOString(),
    }],
  };
  return fallback[league] || [];
}

function jsonResponse(data: any, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=30, s-maxage=60',
      ...headers,
    },
  });
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
};
