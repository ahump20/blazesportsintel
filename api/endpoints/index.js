/**
 * Blaze Sports Intel API Endpoints
 * Main REST API for sports data
 */

import { Router } from 'itty-router';
import { json, error, missing } from 'itty-router-extras';
import { z } from 'zod';

// Create router
const router = Router();

// Middleware for CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// API version prefix
const API_V1 = '/api/v1';

/**
 * Health check endpoint
 */
router.get(`${API_V1}/health`, async (request, env, ctx) => {
  return json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'production',
    services: {
      database: 'connected',
      cache: 'connected',
      storage: 'connected'
    }
  }, { headers: corsHeaders });
});

/**
 * Get team information
 * GET /api/v1/teams/{sport}/{league}/{team}
 */
router.get(`${API_V1}/teams/:sport/:league/:team`, async (request, env, ctx) => {
  const { sport, league, team } = request.params;

  try {
    // Fetch from appropriate data source based on sport/league
    const teamData = await getTeamData(sport, league, team, env);

    if (!teamData) {
      return json({ error: 'Team not found' }, { status: 404, headers: corsHeaders });
    }

    return json({
      success: true,
      data: teamData,
      links: {
        self: `${API_V1}/teams/${sport}/${league}/${team}`,
        roster: `${API_V1}/teams/${sport}/${league}/${team}/roster`,
        schedule: `${API_V1}/teams/${sport}/${league}/${team}/schedule`,
        stats: `${API_V1}/teams/${sport}/${league}/${team}/stats`
      }
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Get player information
 * GET /api/v1/players/{sport}/{id}
 */
router.get(`${API_V1}/players/:sport/:id`, async (request, env, ctx) => {
  const { sport, id } = request.params;

  try {
    const playerData = await getPlayerData(sport, id, env);

    if (!playerData) {
      return json({ error: 'Player not found' }, { status: 404, headers: corsHeaders });
    }

    return json({
      success: true,
      data: playerData,
      links: {
        self: `${API_V1}/players/${sport}/${id}`,
        team: playerData.teamId ? `${API_V1}/teams/${sport}/${playerData.league}/${playerData.teamId}` : null,
        stats: `${API_V1}/players/${sport}/${id}/stats`
      }
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Get live games
 * GET /api/v1/games/{sport}/live
 */
router.get(`${API_V1}/games/:sport/live`, async (request, env, ctx) => {
  const { sport } = request.params;

  try {
    const liveGames = await getLiveGames(sport, env);

    return json({
      success: true,
      sport,
      count: liveGames.length,
      data: liveGames,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Get standings
 * GET /api/v1/standings/{sport}/{league}
 */
router.get(`${API_V1}/standings/:sport/:league`, async (request, env, ctx) => {
  const { sport, league } = request.params;
  const { division, conference } = request.query;

  try {
    const standings = await getStandings(sport, league, { division, conference }, env);

    return json({
      success: true,
      sport,
      league,
      filters: { division, conference },
      data: standings,
      lastUpdated: new Date().toISOString()
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Get statistics
 * GET /api/v1/stats/{sport}/{category}
 */
router.get(`${API_V1}/stats/:sport/:category`, async (request, env, ctx) => {
  const { sport, category } = request.params;
  const { season, week, limit = 50 } = request.query;

  try {
    const stats = await getStatistics(sport, category, { season, week, limit }, env);

    return json({
      success: true,
      sport,
      category,
      filters: { season, week, limit },
      data: stats
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Texas High School Football specific endpoints
 */
router.get(`${API_V1}/texas-hs-football/classifications`, async (request, env, ctx) => {
  const classifications = [
    '6A', '5A-DI', '5A-DII', '4A-DI', '4A-DII',
    '3A-DI', '3A-DII', '2A-DI', '2A-DII', '1A'
  ];

  return json({
    success: true,
    data: classifications,
    totalSchools: 1480, // Approximate
    links: {
      teams: classifications.map(c => ({
        classification: c,
        url: `${API_V1}/texas-hs-football/teams?classification=${c}`
      }))
    }
  }, { headers: corsHeaders });
});

/**
 * Perfect Game Baseball endpoints
 */
router.get(`${API_V1}/perfect-game/tournaments`, async (request, env, ctx) => {
  const { state = 'TX', ageGroup, startDate, endDate } = request.query;

  try {
    const tournaments = await getPerfectGameTournaments({ state, ageGroup, startDate, endDate }, env);

    return json({
      success: true,
      filters: { state, ageGroup, startDate, endDate },
      count: tournaments.length,
      data: tournaments
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Webhook endpoint for updates
 * POST /api/v1/webhooks/update
 */
router.post(`${API_V1}/webhooks/update`, async (request, env, ctx) => {
  try {
    const body = await request.json();

    // Validate webhook payload
    const WebhookSchema = z.object({
      source: z.string(),
      event: z.string(),
      data: z.any(),
      timestamp: z.string()
    });

    const payload = WebhookSchema.parse(body);

    // Process webhook based on source
    await processWebhook(payload, env);

    return json({
      success: true,
      message: 'Webhook processed',
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 400, headers: corsHeaders });
  }
});

/**
 * Search endpoint
 * GET /api/v1/search
 */
router.get(`${API_V1}/search`, async (request, env, ctx) => {
  const { q, sport, type = 'all', limit = 20 } = request.query;

  if (!q || q.length < 2) {
    return json({ error: 'Query must be at least 2 characters' }, { status: 400, headers: corsHeaders });
  }

  try {
    const results = await searchDatabase(q, { sport, type, limit }, env);

    return json({
      success: true,
      query: q,
      filters: { sport, type },
      count: results.length,
      data: results
    }, { headers: corsHeaders });
  } catch (err) {
    return json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
});

/**
 * Handle OPTIONS for CORS
 */
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

/**
 * 404 handler
 */
router.all('*', () => {
  return json({ error: 'Not Found' }, { status: 404, headers: corsHeaders });
});

// Data fetching functions (would connect to actual data sources)
async function getTeamData(sport, league, team, env) {
  // Implementation would fetch from database/cache
  // This is a placeholder
  return {
    id: team,
    sport,
    league,
    name: team.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    city: 'Dallas',
    mascot: 'Cowboys',
    founded: 1960,
    stadium: 'AT&T Stadium',
    capacity: 80000,
    conference: 'NFC',
    division: 'East',
    colors: ['Navy Blue', 'Silver', 'White'],
    website: 'https://www.dallascowboys.com',
    socialMedia: {
      twitter: '@dallascowboys',
      instagram: '@dallascowboys',
      facebook: 'DallasCowboys'
    }
  };
}

async function getPlayerData(sport, id, env) {
  // Placeholder implementation
  return {
    id,
    sport,
    name: 'Dak Prescott',
    position: 'QB',
    jersey: '4',
    team: 'Dallas Cowboys',
    teamId: 'DAL',
    league: 'NFL',
    height: '6-2',
    weight: 238,
    birthDate: '1993-07-29',
    college: 'Mississippi State',
    draftYear: 2016,
    draftRound: 4,
    draftPick: 135
  };
}

async function getLiveGames(sport, env) {
  // Placeholder - would fetch from live data feeds
  return [];
}

async function getStandings(sport, league, filters, env) {
  // Placeholder implementation
  return [];
}

async function getStatistics(sport, category, filters, env) {
  // Placeholder implementation
  return [];
}

async function getPerfectGameTournaments(filters, env) {
  // Placeholder implementation
  return [];
}

async function processWebhook(payload, env) {
  // Process webhook based on source
  console.log('Processing webhook:', payload);
  // Would update database/cache
}

async function searchDatabase(query, filters, env) {
  // Placeholder search implementation
  return [];
}

// Export handler for CloudFlare Workers
export default {
  fetch: router.handle
};