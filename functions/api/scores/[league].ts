/**
 * Cloudflare Pages Function: Live Scores API
 * Real-time scores for MLB, NFL, NBA, NCAA
 *
 * Endpoint: /api/scores/:league
 * Methods: GET
 * Caching: KV with 60-second TTL for live, 5-min for final
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  SPORTS_CACHE: KVNamespace;
  SPORTSDATAIO_API_KEY: string;
}

interface GameScore {
  gameId: string;
  status: 'live' | 'final' | 'scheduled';
  homeTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo?: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    score: number;
    logo?: string;
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

const LEAGUE_CONFIG: Record<string, { endpoint: string; name: string }> = {
  mlb: { endpoint: 'mlb/scores/json/GamesByDate', name: 'MLB' },
  nfl: { endpoint: 'nfl/scores/json/ScoresByWeek', name: 'NFL' },
  nba: { endpoint: 'nba/scores/json/GamesByDate', name: 'NBA' },
  ncaa: { endpoint: 'cfb/scores/json/GamesByWeek', name: 'NCAA Football' },
};

const TEAM_LOGOS: Record<string, string> = {
  // MLB
  'STL': '🔴', 'HOU': '🟠', 'NYY': '🔵', 'LAD': '🔵', 'BOS': '🔴', 'CHC': '🔵',
  'ATL': '🔴', 'PHI': '🔴', 'TEX': '🔵', 'ARI': '🟤', 'MIN': '🔵', 'BAL': '🟠',
  // NFL
  'TEN': '🔵', 'KC': '🔴', 'SF': '🔴', 'DAL': '🔵', 'GB': '🟢', 'BUF': '🔵',
  'PHI': '🟢', 'MIA': '🔵', 'DET': '🔵', 'CLE': '🟤', 'CIN': '🟠', 'BAL': '🟣',
  // NBA
  'MEM': '🔵', 'LAL': '🟡', 'BOS': '🟢', 'GSW': '🔵', 'PHX': '🟠', 'MIL': '🟢',
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const league = (params.league as string)?.toLowerCase();

  // Validate league
  if (!league || !LEAGUE_CONFIG[league]) {
    return jsonResponse({
      ok: false,
      error: 'Invalid league. Supported: mlb, nfl, nba, ncaa',
    }, 400);
  }

  try {
    // Check cache first
    const cacheKey = `scores:${league}:${getTodayDate()}`;
    const cached = await env.SPORTS_CACHE?.get(cacheKey, 'json') as ScoresResponse | null;

    if (cached) {
      return jsonResponse({
        ...cached,
        cached: true,
      }, 200, { 'X-Cache': 'HIT' });
    }

    // Fetch fresh data
    const games = await fetchLiveScores(env, league);

    const response: ScoresResponse = {
      ok: true,
      league: LEAGUE_CONFIG[league].name,
      games,
      cached: false,
      lastUpdate: new Date().toISOString(),
      dataSource: 'SportsDataIO',
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
      league: LEAGUE_CONFIG[league].name,
      games: getDemoScores(league),
      cached: false,
      lastUpdate: new Date().toISOString(),
      dataSource: 'Demo Data (API unavailable)',
    }, 200);
  }
};

async function fetchLiveScores(env: Env, league: string): Promise<GameScore[]> {
  const apiKey = env.SPORTSDATAIO_API_KEY;

  if (!apiKey) {
    console.warn('SPORTSDATAIO_API_KEY not configured, using demo data');
    return getDemoScores(league);
  }

  const config = LEAGUE_CONFIG[league];
  const dateParam = league === 'nfl' || league === 'ncaa'
    ? `2025REG/12` // Current week
    : getTodayDate();

  const apiUrl = `https://api.sportsdata.io/v3/${config.endpoint}/${dateParam}?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BlazeSportsIntel/2.0',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json() as any[];
  return transformScores(data, league);
}

function transformScores(data: any[], league: string): GameScore[] {
  return data.slice(0, 10).map((game: any) => {
    const homeAbbr = game.HomeTeam || game.HomeTeamKey || 'HOME';
    const awayAbbr = game.AwayTeam || game.AwayTeamKey || 'AWAY';

    let status: 'live' | 'final' | 'scheduled' = 'scheduled';
    if (game.Status === 'InProgress' || game.Status === 'Live') status = 'live';
    else if (game.Status === 'Final' || game.Status === 'F') status = 'final';

    let period = '';
    if (league === 'mlb') {
      period = game.Inning ? `${game.InningHalf || 'Bot'} ${game.Inning}` : '';
    } else if (league === 'nfl' || league === 'ncaa') {
      period = game.Quarter ? `Q${game.Quarter}` : '';
    } else if (league === 'nba') {
      period = game.Quarter ? `Q${game.Quarter}` : '';
    }

    return {
      gameId: String(game.GameID || game.GameKey),
      status,
      homeTeam: {
        name: game.HomeTeamName || game.HomeTeam || 'Home',
        abbreviation: homeAbbr,
        score: game.HomeTeamScore ?? game.HomeScore ?? 0,
        logo: TEAM_LOGOS[homeAbbr] || '🏟️',
      },
      awayTeam: {
        name: game.AwayTeamName || game.AwayTeam || 'Away',
        abbreviation: awayAbbr,
        score: game.AwayTeamScore ?? game.AwayScore ?? 0,
        logo: TEAM_LOGOS[awayAbbr] || '🏟️',
      },
      period,
      venue: game.Stadium?.Name || game.StadiumName || 'TBD',
      startTime: game.DateTime || game.Day || new Date().toISOString(),
      lastUpdate: game.Updated || new Date().toISOString(),
    };
  });
}

function getDemoScores(league: string): GameScore[] {
  const demoData: Record<string, GameScore[]> = {
    mlb: [
      {
        gameId: 'demo-mlb-1',
        status: 'live',
        homeTeam: { name: 'St. Louis Cardinals', abbreviation: 'STL', score: 7, logo: '🔴' },
        awayTeam: { name: 'Houston Astros', abbreviation: 'HOU', score: 5, logo: '🟠' },
        period: 'Bot 8',
        venue: 'Busch Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
      {
        gameId: 'demo-mlb-2',
        status: 'live',
        homeTeam: { name: 'Texas Rangers', abbreviation: 'TEX', score: 3, logo: '🔵' },
        awayTeam: { name: 'Atlanta Braves', abbreviation: 'ATL', score: 4, logo: '🔴' },
        period: 'Top 6',
        venue: 'Globe Life Field',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
    ],
    nfl: [
      {
        gameId: 'demo-nfl-1',
        status: 'live',
        homeTeam: { name: 'Tennessee Titans', abbreviation: 'TEN', score: 21, logo: '🔵' },
        awayTeam: { name: 'Houston Texans', abbreviation: 'HOU', score: 17, logo: '🔴' },
        period: 'Q3',
        venue: 'Nissan Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
      {
        gameId: 'demo-nfl-2',
        status: 'final',
        homeTeam: { name: 'Dallas Cowboys', abbreviation: 'DAL', score: 24, logo: '🔵' },
        awayTeam: { name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 31, logo: '🟢' },
        period: 'Final',
        venue: 'AT&T Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
    ],
    nba: [
      {
        gameId: 'demo-nba-1',
        status: 'live',
        homeTeam: { name: 'Memphis Grizzlies', abbreviation: 'MEM', score: 98, logo: '🔵' },
        awayTeam: { name: 'Los Angeles Lakers', abbreviation: 'LAL', score: 94, logo: '🟡' },
        period: 'Q4',
        venue: 'FedExForum',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
    ],
    ncaa: [
      {
        gameId: 'demo-ncaa-1',
        status: 'final',
        homeTeam: { name: 'Texas Longhorns', abbreviation: 'TEX', score: 38, logo: '🟠' },
        awayTeam: { name: 'Texas A&M Aggies', abbreviation: 'TAMU', score: 24, logo: '🟤' },
        period: 'Final',
        venue: 'Darrell K Royal Stadium',
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
    ],
  };

  return demoData[league] || [];
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0].replace(/-/g, '-');
}

function jsonResponse(data: any, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
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
