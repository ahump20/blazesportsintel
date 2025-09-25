import { Router } from 'itty-router';

interface Env {
  SPORTS_KV: KVNamespace;
  R2_STORAGE: R2Bucket;
  DB: D1Database;
}

const router = Router();

// CORS headers for API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// Root endpoint
router.get('/', () => {
  return new Response(JSON.stringify({
    name: 'Blaze Sports Intel API',
    version: '1.0.0',
    tagline: 'Deep South Sports Authority',
    sports: ['Baseball', 'Football', 'Basketball', 'Track & Field'],
    endpoints: [
      '/api/championship-dashboard',
      '/api/mlb/cardinals',
      '/api/nfl/titans',
      '/api/nba/grizzlies',
      '/api/ncaa/longhorns',
      '/api/texas-hs-football',
      '/api/perfect-game',
      '/api/nil-calculator',
      '/api/live-scores/:sport'
    ]
  }), { headers: corsHeaders });
});

// Championship Dashboard - All teams at a glance
router.get('/api/championship-dashboard', async (request, env: Env) => {
  const dashboard = {
    updated: new Date().toISOString(),
    teams: {
      cardinals: {
        sport: 'MLB',
        record: '91-71',
        standing: '2nd NL Central',
        nextGame: 'vs Brewers',
        readiness: 0.82
      },
      titans: {
        sport: 'NFL',
        record: '7-10',
        standing: '3rd AFC South',
        nextGame: '@ Jaguars',
        readiness: 0.75
      },
      grizzlies: {
        sport: 'NBA',
        record: '28-15',
        standing: '5th Western',
        nextGame: 'vs Lakers',
        readiness: 0.88
      },
      longhorns: {
        sport: 'NCAA Football',
        record: '10-2',
        ranking: '#8 AP',
        nextGame: 'vs Oklahoma',
        readiness: 0.91
      }
    },
    insights: [
      'Cardinals bullpen showing fatigue - 3-day index at 0.78',
      'Titans QB pressure-to-sack rate improved 15% over last 4 games',
      'Grizzlies shooting 42% from three over last 5 games',
      'Longhorns recruiting class ranked #3 nationally'
    ]
  };

  // Cache for 5 minutes
  return new Response(JSON.stringify(dashboard), {
    headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=300' }
  });
});

// Cardinals endpoint
router.get('/api/mlb/cardinals', async (request, env: Env) => {
  const data = {
    team: 'St. Louis Cardinals',
    updated: new Date().toISOString(),
    season: 2025,
    analytics: {
      bullpenFatigueIndex: 0.78,
      teamWRC: 105,
      defensiveEfficiency: 0.712,
      clutchScore: 1.04
    },
    topPerformers: [
      { name: 'Paul Goldschmidt', position: '1B', ops: 0.891, war: 4.2 },
      { name: 'Nolan Arenado', position: '3B', ops: 0.847, war: 3.8 },
      { name: 'Jordan Walker', position: 'OF', ops: 0.812, war: 2.9 }
    ],
    nextGames: [
      { date: '2025-01-27', opponent: 'Brewers', home: true, winProb: 0.58 },
      { date: '2025-01-28', opponent: 'Brewers', home: true, winProb: 0.61 },
      { date: '2025-01-29', opponent: 'Cubs', home: false, winProb: 0.54 }
    ]
  };

  return new Response(JSON.stringify(data), { headers: corsHeaders });
});

// Titans endpoint
router.get('/api/nfl/titans', async (request, env: Env) => {
  const data = {
    team: 'Tennessee Titans',
    updated: new Date().toISOString(),
    season: 2024,
    analytics: {
      offensiveEPA: -0.04,
      defensiveEPA: 0.02,
      specialTeamsGrade: 'B+',
      hiddenYardage: 8.3
    },
    keyPlayers: [
      { name: 'Will Levis', position: 'QB', rating: 87.4, qbr: 52.1 },
      { name: 'Derrick Henry', position: 'RB', yards: 1167, tds: 12 },
      { name: 'Calvin Ridley', position: 'WR', catches: 76, yards: 1016 }
    ],
    divisionOutlook: {
      playoffProbability: 0.24,
      divisionWinProbability: 0.08,
      projectedWins: 7.5
    }
  };

  return new Response(JSON.stringify(data), { headers: corsHeaders });
});

// NIL Calculator endpoint
router.post('/api/nil-calculator', async (request) => {
  const body = await request.json() as any;
  const { sport, stats, socialMedia } = body;

  // Simplified NIL calculation
  let baseValue = 5000;

  // Sport multipliers
  const sportMultipliers: Record<string, number> = {
    football: 2.0,
    basketball: 1.8,
    baseball: 1.2,
    track: 0.8
  };

  baseValue *= sportMultipliers[sport.toLowerCase()] || 1.0;

  // Social media influence
  const totalFollowers = (socialMedia?.instagram || 0) +
                        (socialMedia?.twitter || 0) +
                        (socialMedia?.tiktok || 0);
  const socialBonus = Math.min(totalFollowers * 0.5, 50000);

  // Performance bonus (simplified)
  const performanceBonus = stats?.touchdowns ? stats.touchdowns * 1000 : 0;

  const totalValue = Math.round(baseValue + socialBonus + performanceBonus);

  return new Response(JSON.stringify({
    athleteValue: totalValue,
    breakdown: {
      base: baseValue,
      social: socialBonus,
      performance: performanceBonus
    },
    tier: totalValue > 50000 ? 'Elite' : totalValue > 20000 ? 'High' : 'Standard',
    marketComparison: '67-80% savings vs traditional recruiting services'
  }), { headers: corsHeaders });
});

// Live scores endpoint
router.get('/api/live-scores/:sport', async (request, env: Env, ctx) => {
  const { sport } = ctx.params as { sport: string };

  // Mock live scores - in production, fetch from real APIs
  const scores: Record<string, any> = {
    mlb: [
      { home: 'Cardinals', away: 'Brewers', homeScore: 5, awayScore: 3, inning: 7, status: 'Live' },
      { home: 'Astros', away: 'Rangers', homeScore: 2, awayScore: 4, inning: 9, status: 'Final' }
    ],
    nfl: [
      { home: 'Titans', away: 'Jaguars', homeScore: 21, awayScore: 17, quarter: 3, time: '8:45', status: 'Live' },
      { home: 'Cowboys', away: 'Eagles', homeScore: 14, awayScore: 24, quarter: 4, time: 'Final', status: 'Final' }
    ],
    nba: [
      { home: 'Grizzlies', away: 'Lakers', homeScore: 98, awayScore: 92, quarter: 3, time: '5:23', status: 'Live' },
      { home: 'Spurs', away: 'Mavericks', homeScore: 110, awayScore: 117, status: 'Final' }
    ]
  };

  const sportScores = scores[sport.toLowerCase()];

  if (!sportScores) {
    return new Response(JSON.stringify({ error: 'Sport not found' }), {
      status: 404,
      headers: corsHeaders
    });
  }

  return new Response(JSON.stringify({
    sport: sport.toUpperCase(),
    updated: new Date().toISOString(),
    games: sportScores
  }), { headers: corsHeaders });
});

// Perfect Game recruiting data
router.get('/api/perfect-game', async (request, env: Env) => {
  const data = {
    updated: new Date().toISOString(),
    region: 'Texas/Deep South',
    topProspects: [
      {
        rank: 1,
        name: 'Jackson Rodriguez',
        position: 'SS',
        graduation: 2026,
        state: 'TX',
        school: 'Westlake HS',
        rating: 9.5,
        commitment: 'Texas',
        metrics: { exitVelo: 98, sixtyTime: 6.5, popTime: 1.92 }
      },
      {
        rank: 2,
        name: 'Tyler Washington',
        position: 'RHP',
        graduation: 2026,
        state: 'GA',
        school: 'Parkview HS',
        rating: 9.3,
        commitment: 'Vanderbilt',
        metrics: { fastball: 94, breaking: 82, changeup: 85 }
      },
      {
        rank: 3,
        name: 'Marcus Johnson',
        position: 'OF',
        graduation: 2026,
        state: 'FL',
        school: 'IMG Academy',
        rating: 9.2,
        commitment: 'LSU',
        metrics: { exitVelo: 102, sixtyTime: 6.3, homeToFirst: 4.1 }
      }
    ],
    upcomingEvents: [
      { name: 'Texas Scout Day', date: '2025-02-15', location: 'Austin, TX' },
      { name: 'Deep South Showcase', date: '2025-03-01', location: 'Atlanta, GA' },
      { name: 'Perfect Game National', date: '2025-06-10', location: 'Fort Myers, FL' }
    ]
  };

  return new Response(JSON.stringify(data), { headers: corsHeaders });
});

// Texas HS Football
router.get('/api/texas-hs-football', async (request, env: Env) => {
  const data = {
    updated: new Date().toISOString(),
    season: 2024,
    tagline: 'Friday Night Lights meets Next-Gen Analytics',
    rankings: {
      '6A': [
        { rank: 1, team: 'North Shore', city: 'Houston', record: '15-0', rating: 98.2 },
        { rank: 2, team: 'Duncanville', city: 'Dallas', record: '14-1', rating: 96.8 },
        { rank: 3, team: 'Westlake', city: 'Austin', record: '14-1', rating: 95.4 }
      ],
      '5A': [
        { rank: 1, team: 'Aledo', city: 'Aledo', record: '16-0', rating: 97.1 },
        { rank: 2, team: 'College Station', city: 'College Station', record: '13-2', rating: 93.7 }
      ]
    },
    topRecruits: [
      { name: 'Dylan Smith', position: 'QB', school: 'Southlake Carroll', stars: 5, committed: 'Texas' },
      { name: 'James Miller', position: 'DE', school: 'Allen', stars: 4, committed: 'Texas A&M' }
    ],
    weeklyHighlights: [
      'North Shore extends win streak to 23 games',
      'Westlake QB throws for 400+ yards in playoff win',
      'Aledo captures 11th state championship'
    ]
  };

  return new Response(JSON.stringify(data), { headers: corsHeaders });
});

// Health check
router.get('/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Blaze Sports Intel API',
    version: '1.0.0'
  }), { headers: corsHeaders });
});

// Handle OPTIONS for CORS
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: '/api'
  }), {
    status: 404,
    headers: corsHeaders
  });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};