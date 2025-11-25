/**
 * Cloudflare Pages Function: Live Scores API
 * Real-time scores for MLB, NFL, NBA, NCAA
 * Uses ESPN's free public API (no auth required)
 *
 * Endpoint: /api/scores/:league
 * Methods: GET
 */

interface Env {
  SPORTS_CACHE?: KVNamespace;
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

// ESPN API endpoints - FREE, no auth required
const ESPN_CONFIG: Record<string, { endpoint: string; name: string }> = {
  mlb: {
    endpoint: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    name: 'MLB'
  },
  nfl: {
    endpoint: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    name: 'NFL'
  },
  nba: {
    endpoint: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    name: 'NBA'
  },
  ncaa: {
    endpoint: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    name: 'NCAA Football'
  },
  'college-baseball': {
    endpoint: 'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard',
    name: 'College Baseball'
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const league = (params.league as string)?.toLowerCase();

  // Validate league
  if (!league || !ESPN_CONFIG[league]) {
    return jsonResponse({
      ok: false,
      error: 'Invalid league. Supported: mlb, nfl, nba, ncaa, college-baseball',
      availableLeagues: Object.keys(ESPN_CONFIG)
    }, 400);
  }

  try {
    // Check cache first (60-second TTL for live scores)
    const cacheKey = `espn:scores:${league}`;
    if (env.SPORTS_CACHE) {
      const cached = await env.SPORTS_CACHE.get(cacheKey, 'json') as ScoresResponse | null;
      if (cached) {
        return jsonResponse({
          ...cached,
          cached: true,
        }, 200, { 'X-Cache': 'HIT' });
      }
    }

    // Fetch from ESPN
    const games = await fetchESPNScores(league);

    const response: ScoresResponse = {
      ok: true,
      league: ESPN_CONFIG[league].name,
      games,
      cached: false,
      lastUpdate: new Date().toISOString(),
      dataSource: 'ESPN',
    };

    // Cache for 60 seconds
    if (env.SPORTS_CACHE) {
      await env.SPORTS_CACHE.put(cacheKey, JSON.stringify(response), {
        expirationTtl: 60,
      });
    }

    return jsonResponse(response, 200, { 'X-Cache': 'MISS' });

  } catch (error) {
    console.error(`Error fetching ${league} scores:`, error);

    // Return fallback demo data on error
    return jsonResponse({
      ok: true,
      league: ESPN_CONFIG[league].name,
      games: getFallbackScores(league),
      cached: false,
      lastUpdate: new Date().toISOString(),
      dataSource: 'Demo (ESPN unavailable)',
    }, 200);
  }
};

function getFallbackScores(league: string): GameScore[] {
  const fallback: Record<string, GameScore[]> = {
    mlb: [
      {
        gameId: 'fallback-mlb-1',
        status: 'scheduled' as const,
        homeTeam: { name: 'St. Louis Cardinals', abbreviation: 'STL', score: 0, logo: '' },
        awayTeam: { name: 'Houston Astros', abbreviation: 'HOU', score: 0, logo: '' },
        period: 'Season starts March 2025',
        venue: 'Busch Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      }
    ],
    nfl: [
      {
        gameId: 'fallback-nfl-1',
        status: 'final' as const,
        homeTeam: { name: 'Houston Texans', abbreviation: 'HOU', score: 23, logo: '' },
        awayTeam: { name: 'Buffalo Bills', abbreviation: 'BUF', score: 19, logo: '' },
        period: 'Final',
        venue: 'NRG Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
      {
        gameId: 'fallback-nfl-2',
        status: 'final' as const,
        homeTeam: { name: 'Chicago Bears', abbreviation: 'CHI', score: 31, logo: '' },
        awayTeam: { name: 'Pittsburgh Steelers', abbreviation: 'PIT', score: 28, logo: '' },
        period: 'Final',
        venue: 'Soldier Field',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      }
    ],
    nba: [
      {
        gameId: 'fallback-nba-1',
        status: 'scheduled' as const,
        homeTeam: { name: 'Memphis Grizzlies', abbreviation: 'MEM', score: 0, logo: '' },
        awayTeam: { name: 'San Antonio Spurs', abbreviation: 'SAS', score: 0, logo: '' },
        period: 'Games Tonight',
        venue: 'FedExForum',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      }
    ],
    ncaa: [
      {
        gameId: 'fallback-ncaa-1',
        status: 'final' as const,
        homeTeam: { name: 'Texas Longhorns', abbreviation: 'TEX', score: 35, logo: '' },
        awayTeam: { name: 'Kentucky Wildcats', abbreviation: 'UK', score: 13, logo: '' },
        period: 'Final',
        venue: 'DKR Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      }
    ],
    'college-baseball': [
      {
        gameId: 'fallback-cbb-1',
        status: 'scheduled' as const,
        homeTeam: { name: 'Texas Longhorns', abbreviation: 'TEX', score: 0, logo: '' },
        awayTeam: { name: 'LSU Tigers', abbreviation: 'LSU', score: 0, logo: '' },
        period: 'Season starts Feb 2025',
        venue: 'UFCU Disch-Falk Field',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      }
    ]
  };
  return fallback[league] || [];
}

async function fetchESPNScores(league: string): Promise<GameScore[]> {
  const config = ESPN_CONFIG[league];

  const response = await fetch(config.endpoint, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BlazeSportsIntel/2.0',
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return transformESPNScores(data);
}

function transformESPNScores(data: any): GameScore[] {
  if (!data.events || !Array.isArray(data.events)) {
    return [];
  }

  return data.events.slice(0, 12).map((event: any) => {
    const competition = event.competitions?.[0];
    if (!competition) return null;

    const homeTeamData = competition.competitors?.find((c: any) => c.homeAway === 'home');
    const awayTeamData = competition.competitors?.find((c: any) => c.homeAway === 'away');

    if (!homeTeamData || !awayTeamData) return null;

    // Determine game status
    let status: 'live' | 'final' | 'scheduled' = 'scheduled';
    const statusType = competition.status?.type?.name || event.status?.type?.name;

    if (statusType === 'STATUS_IN_PROGRESS' || statusType === 'STATUS_HALFTIME') {
      status = 'live';
    } else if (statusType === 'STATUS_FINAL' || statusType === 'STATUS_FINAL_OT') {
      status = 'final';
    }

    // Get period/inning info
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
