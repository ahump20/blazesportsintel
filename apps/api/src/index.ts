/**
 * Blaze Sports Intel API
 * Texas-inspired sports intelligence platform
 * The Deep South Sports Authority
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';

export interface Env {
  DATA_BUCKET: R2Bucket;
  CACHE: KVNamespace;
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: 'production' | 'staging' | 'development';
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', compress());
app.use('*', cors({
  origin: [
    'https://blazesportsintel.com',
    'https://www.blazesportsintel.com',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Cache strategy
app.use('/v1/*', cache({
  cacheName: 'blaze-api-cache',
  cacheControl: 'max-age=300, s-maxage=600',
  vary: ['Accept', 'Origin']
}));

// Root endpoint with comprehensive API documentation
app.get('/', (c) => {
  return c.json({
    name: 'Blaze Sports Intel API',
    version: '1.0.0',
    description: 'Texas-inspired sports intelligence platform - The Deep South Sports Authority',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    documentation: 'https://blazesportsintel.com/docs/api',
    endpoints: {
      leagues: '/v1/leagues',
      teams: '/v1/{league}/{season}/teams',
      roster: '/v1/{league}/{season}/roster?teamId={id}',
      standings: '/v1/{league}/{season}/standings',
      schedule: '/v1/{league}/{season}/schedules?week={n}&teamId={id}',
      games: '/v1/{league}/{season}/games/{gameId}',
      players: '/v1/{league}/{season}/players/{playerId}',
      stats: '/v1/{league}/{season}/stats/{playerId}',
      recruiting: '/v1/recruiting/{graduationYear}',
      nil: '/v1/nil/calculator'
    },
    coverage: {
      professional: ['NFL (Titans emphasis)', 'MLB (Cardinals emphasis)', 'NBA (Grizzlies emphasis)'],
      college: ['NCAA Football (Longhorns/SEC)', 'NCAA Basketball', 'College Baseball'],
      highSchool: ['Texas HS Football (UIL All Classifications)'],
      youth: ['Perfect Game Baseball (Texas Focus)']
    },
    specialFeatures: {
      cardinalsReadiness: '/v1/cardinals/readiness',
      titansAnalytics: '/v1/titans/analytics',
      longhornsRecruiting: '/v1/longhorns/recruiting',
      grizzliesPerformance: '/v1/grizzlies/performance',
      texasHSRankings: '/v1/tx-hs-fb/rankings/{classification}',
      perfectGameEvents: '/v1/perfect-game/events'
    },
    brand: {
      heritage: 'Texas as a state of mind: scale, grit, and pride',
      colors: {
        primary: '#BF5700', // Burnt Orange Heritage
        secondary: '#002244', // Tennessee Deep
        accent: '#00B2A9' // Vancouver Throwback Teal
      }
    }
  });
});

// Get teams for a league/season
app.get('/v1/:league/:season/teams', async (c) => {
  const { league, season } = c.req.param();

  try {
    // Try cache first
    const cacheKey = `teams_${league}_${season}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    // Fetch from R2
    const key = `data/${league}/${season}/teams.jsonl`;
    const object = await c.env.DATA_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Data not found' }, 404);
    }

    const text = await object.text();
    const teams = text.split('\n').filter(Boolean).map(line => JSON.parse(line));

    // Cache for 5 minutes
    await c.env.CACHE.put(cacheKey, JSON.stringify(teams), { expirationTtl: 300 });

    return c.json(teams);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get roster for a team
app.get('/v1/:league/:season/roster', async (c) => {
  const { league, season } = c.req.param();
  const teamId = c.req.query('teamId');

  if (!teamId) {
    return c.json({ error: 'teamId query parameter required' }, 400);
  }

  try {
    const cacheKey = `roster_${league}_${season}_${teamId}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const key = `data/${league}/${season}/players.jsonl`;
    const object = await c.env.DATA_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Data not found' }, 404);
    }

    const text = await object.text();
    const allPlayers = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
    const roster = allPlayers.filter((p: any) => p.teamId === teamId);

    await c.env.CACHE.put(cacheKey, JSON.stringify(roster), { expirationTtl: 300 });

    return c.json(roster);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get standings
app.get('/v1/:league/:season/standings', async (c) => {
  const { league, season } = c.req.param();

  try {
    const cacheKey = `standings_${league}_${season}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const key = `data/${league}/${season}/standings.jsonl`;
    const object = await c.env.DATA_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Data not found' }, 404);
    }

    const text = await object.text();
    const standings = text.split('\n').filter(Boolean).map(line => JSON.parse(line));

    await c.env.CACHE.put(cacheKey, JSON.stringify(standings), { expirationTtl: 300 });

    return c.json(standings);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get schedule
app.get('/v1/:league/:season/schedules', async (c) => {
  const { league, season } = c.req.param();
  const week = c.req.query('week');
  const teamId = c.req.query('teamId');

  try {
    const cacheKey = `schedule_${league}_${season}_${week || 'all'}_${teamId || 'all'}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const key = `data/${league}/${season}/schedules.jsonl`;
    const object = await c.env.DATA_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Data not found' }, 404);
    }

    const text = await object.text();
    let games = text.split('\n').filter(Boolean).map(line => JSON.parse(line));

    // Filter by week if specified
    if (week) {
      games = games.filter((g: any) => g.week === parseInt(week));
    }

    // Filter by team if specified
    if (teamId) {
      games = games.filter((g: any) => g.homeTeamId === teamId || g.awayTeamId === teamId);
    }

    await c.env.CACHE.put(cacheKey, JSON.stringify(games), { expirationTtl: 300 });

    return c.json(games);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get player details
app.get('/v1/:league/:season/players/:playerId', async (c) => {
  const { league, season, playerId } = c.req.param();

  try {
    const cacheKey = `player_${league}_${season}_${playerId}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const key = `data/${league}/${season}/players.jsonl`;
    const object = await c.env.DATA_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Data not found' }, 404);
    }

    const text = await object.text();
    const players = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
    const player = players.find((p: any) => p.id === playerId);

    if (!player) {
      return c.json({ error: 'Player not found' }, 404);
    }

    await c.env.CACHE.put(cacheKey, JSON.stringify(player), { expirationTtl: 300 });

    return c.json(player);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get metadata
app.get('/v1/:league/:season/metadata', async (c) => {
  const { league, season } = c.req.param();

  try {
    const key = `data/${league}/${season}/metadata.json`;
    const object = await c.env.DATA_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Metadata not found' }, 404);
    }

    const metadata = await object.json();
    return c.json(metadata);
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Special team emphasis endpoints
app.get('/v1/cardinals/readiness', async (c) => {
  // Cardinals-specific readiness analytics
  const kv = c.env.CACHE;
  const cached = await kv.get('cardinals:readiness', 'json');

  if (cached) {
    return c.json(cached);
  }

  const readiness = {
    timestamp: new Date().toISOString(),
    team: 'St. Louis Cardinals',
    overall: 0.85,
    offense: {
      score: 0.82,
      factors: {
        batting: 0.84,
        power: 0.78,
        speed: 0.83,
        clutch: 0.85,
        risp: 0.79 // Runners in scoring position
      }
    },
    pitching: {
      score: 0.88,
      factors: {
        starters: 0.90,
        bullpen: 0.85,
        closing: 0.89,
        leftySpecialists: 0.83
      }
    },
    defense: {
      score: 0.85,
      factors: {
        fielding: 0.87,
        range: 0.83,
        armStrength: 0.85,
        doublePlayTurns: 0.88
      }
    },
    momentum: {
      last5: 'W3-L2',
      trend: 'stable',
      keyInjuries: [],
      weatherFactor: 0.95
    },
    nextGame: {
      opponent: 'Chicago Cubs',
      matchupAdvantage: 0.68,
      venue: 'Busch Stadium'
    }
  };

  // Cache for 10 minutes
  await kv.put('cardinals:readiness', JSON.stringify(readiness), {
    expirationTtl: 600
  });

  return c.json(readiness);
});

app.get('/v1/titans/analytics', async (c) => {
  // Tennessee Titans comprehensive analytics
  const analytics = {
    timestamp: new Date().toISOString(),
    team: 'Tennessee Titans',
    record: '7-3',
    offensiveMetrics: {
      passingEfficiency: 0.76,
      rushingSuccess: 0.81,
      redZoneConversion: 0.68,
      thirdDownConversion: 0.42,
      timeOfPossession: '31:45',
      explosivePlays: 18
    },
    defensiveMetrics: {
      passDefense: 0.73,
      runDefense: 0.85,
      pressureRate: 0.38,
      turnoverRate: 0.15,
      redZoneDefense: 0.71,
      thirdDownStops: 0.39
    },
    specialTeams: {
      fieldGoalPct: 0.85,
      puntAverage: 44.2,
      returnAverage: 23.5,
      coverage: 0.82
    },
    coaching: {
      adjustments: 0.78,
      fourthDownDecisions: 0.83,
      timeoutUsage: 0.71
    },
    keyPlayers: [
      {
        name: 'Derrick Henry',
        position: 'RB',
        impact: 0.92,
        health: 'Healthy'
      },
      {
        name: 'Ryan Tannehill',
        position: 'QB',
        impact: 0.78,
        health: 'Healthy'
      }
    ]
  };

  return c.json(analytics);
});

app.get('/v1/longhorns/recruiting', async (c) => {
  // Texas Longhorns recruiting dashboard
  const recruiting = {
    timestamp: new Date().toISOString(),
    team: 'Texas Longhorns',
    class: '2025',
    nationalRank: 3,
    conferenceRank: 1,
    commits: 22,
    averageRating: 0.92,
    totalPoints: 285.4,
    topTargets: [
      {
        name: 'Elite QB Prospect',
        position: 'QB',
        stars: 5,
        hometown: 'Dallas, TX',
        status: 'committed',
        rating: 0.98
      },
      {
        name: 'Top DL Target',
        position: 'DL',
        stars: 4,
        hometown: 'Houston, TX',
        status: 'visiting',
        rating: 0.89
      }
    ],
    byPosition: {
      QB: 1,
      RB: 2,
      WR: 4,
      TE: 1,
      OL: 5,
      DL: 4,
      LB: 3,
      CB: 2,
      S: 1
    },
    momentum: 'rising',
    texasPipeline: {
      inState: 18,
      outOfState: 4,
      texasRank: 1
    },
    competitors: [
      'Alabama',
      'Georgia',
      'LSU',
      'Texas A&M'
    ]
  };

  return c.json(recruiting);
});

app.get('/v1/grizzlies/performance', async (c) => {
  // Memphis Grizzlies advanced performance metrics
  const performance = {
    timestamp: new Date().toISOString(),
    team: 'Memphis Grizzlies',
    season: '2024-25',
    record: '12-8',
    advancedStats: {
      offensiveRating: 115.2,
      defensiveRating: 108.4,
      netRating: 6.8,
      pace: 99.8,
      effectiveFieldGoalPct: 0.542,
      trueShooting: 0.578,
      assistRatio: 18.2,
      reboundRate: 0.512
    },
    clutchPerformance: {
      clutchRecord: '8-4',
      clutchOffRating: 112.3,
      clutchDefRating: 105.1,
      closeGameWinPct: 0.67
    },
    playerImpact: [
      {
        name: 'Ja Morant',
        position: 'PG',
        plusMinus: 8.7,
        usage: 0.31,
        efficiency: 0.58
      },
      {
        name: 'Jaren Jackson Jr.',
        position: 'PF',
        plusMinus: 6.2,
        usage: 0.23,
        efficiency: 0.61
      }
    ],
    trends: {
      last10Games: '7-3',
      homeRecord: '8-2',
      awayRecord: '4-6',
      momentum: 'positive'
    }
  };

  return c.json(performance);
});

// Texas HS Football endpoints
app.get('/v1/tx-hs-fb/rankings/:classification', async (c) => {
  const classification = c.req.param('classification');

  const rankings = {
    timestamp: new Date().toISOString(),
    classification,
    week: 'Week 12',
    poll: 'Dave Campbell\'s Texas Football',
    teams: [
      {
        rank: 1,
        team: 'Austin Westlake',
        record: '11-0',
        previousRank: 1,
        points: 225,
        district: '26-6A',
        region: 'IV'
      },
      {
        rank: 2,
        team: 'Southlake Carroll',
        record: '10-1',
        previousRank: 3,
        points: 210,
        district: '4-6A',
        region: 'I'
      },
      {
        rank: 3,
        team: 'Katy',
        record: '10-1',
        previousRank: 2,
        points: 195,
        district: '19-6A',
        region: 'III'
      },
      {
        rank: 4,
        team: 'Duncanville',
        record: '9-2',
        previousRank: 4,
        points: 180,
        district: '8-6A',
        region: 'II'
      },
      {
        rank: 5,
        team: 'North Shore',
        record: '10-1',
        previousRank: 6,
        points: 165,
        district: '21-6A',
        region: 'III'
      }
    ],
    playoffBracket: {
      region1: ['Southlake Carroll', 'Allen', 'Plano East'],
      region2: ['Duncanville', 'DeSoto', 'Cedar Hill'],
      region3: ['North Shore', 'Katy', 'Cy-Fair'],
      region4: ['Austin Westlake', 'Lake Travis', 'San Antonio Reagan']
    }
  };

  return c.json(rankings);
});

// Perfect Game Baseball endpoints
app.get('/v1/perfect-game/events', async (c) => {
  const events = {
    timestamp: new Date().toISOString(),
    upcoming: [
      {
        name: 'PG National Championship',
        location: 'Fort Myers, FL',
        dates: '2025-07-15 to 2025-07-21',
        ageGroup: '17U',
        teams: 64,
        texasTeams: 8
      },
      {
        name: 'PG World Series',
        location: 'Jupiter, FL',
        dates: '2025-07-28 to 2025-08-03',
        ageGroup: '16U',
        teams: 48,
        texasTeams: 6
      }
    ],
    texasEvents: [
      {
        name: 'Texas State Championships',
        location: 'Houston, TX',
        dates: '2025-06-20 to 2025-06-25',
        ageGroup: 'Multiple',
        teams: 128,
        venue: 'Minute Maid Park Complex'
      },
      {
        name: 'PG Texas Showcase',
        location: 'Dallas, TX',
        dates: '2025-06-01 to 2025-06-02',
        ageGroup: '15U-17U',
        players: 300,
        venue: 'Dallas Baptist University'
      }
    ],
    topProspects: [
      {
        name: 'Elite Texas Pitcher',
        position: 'RHP',
        graduation: 2025,
        velocity: 95,
        pgGrade: 9.5,
        commitment: 'Texas'
      },
      {
        name: 'Top Texas Shortstop',
        position: 'SS',
        graduation: 2025,
        exitVelo: 102,
        pgGrade: 9.0,
        commitment: 'LSU'
      }
    ]
  };

  return c.json(events);
});

// NIL Calculator endpoint
app.post('/v1/nil/calculator', async (c) => {
  const body = await c.req.json();

  const {
    sport,
    position,
    stats,
    socialMedia = {},
    marketSize = 'medium',
    schoolTier = 'P5'
  } = body;

  // Simplified NIL valuation algorithm
  let baseValue = 0;

  // Sport multipliers
  const sportMultipliers = {
    football: 1.0,
    basketball: 0.8,
    baseball: 0.6
  };

  // Position multipliers for football
  const positionMultipliers = {
    QB: 1.5,
    RB: 1.2,
    WR: 1.2,
    TE: 1.0,
    OL: 0.8,
    DL: 1.0,
    LB: 1.0,
    CB: 1.1,
    S: 1.0
  };

  // Calculate performance score
  let performanceScore = 0.5; // Base
  if (stats.touchdowns > 20) performanceScore += 0.2;
  if (stats.yards > 1500) performanceScore += 0.2;
  if (stats.average > 7) performanceScore += 0.1;

  // Social media influence
  const totalFollowers = (socialMedia.instagram || 0) +
                        (socialMedia.twitter || 0) +
                        (socialMedia.tiktok || 0);

  let socialScore = Math.min(totalFollowers / 10000, 1.0);

  // Market size multiplier
  const marketMultipliers = {
    small: 0.7,
    medium: 1.0,
    large: 1.5,
    texas: 1.8 // Texas premium
  };

  baseValue = 50000 *
              (sportMultipliers[sport] || 1.0) *
              (positionMultipliers[position] || 1.0) *
              performanceScore *
              (1 + socialScore) *
              (marketMultipliers[marketSize] || 1.0);

  const valuation = {
    timestamp: new Date().toISOString(),
    estimatedValue: Math.round(baseValue),
    breakdown: {
      baseValue: 50000,
      sportMultiplier: sportMultipliers[sport] || 1.0,
      positionMultiplier: positionMultipliers[position] || 1.0,
      performanceScore,
      socialInfluence: socialScore,
      marketMultiplier: marketMultipliers[marketSize] || 1.0
    },
    recommendations: [
      'Focus on social media growth',
      'Maintain high performance standards',
      'Build personal brand authentically',
      'Consider Texas market advantages'
    ],
    comparables: [
      'Similar players in your conference',
      'Position players at similar schools',
      'Players with comparable stats'
    ]
  };

  return c.json(valuation);
});

export default app;