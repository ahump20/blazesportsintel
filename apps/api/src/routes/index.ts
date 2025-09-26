/**
 * REST API Routes Setup
 * Comprehensive RESTful endpoints for all sports data
 */

import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';

// Import route modules
import { setupTeamsRoutes } from './teams.js';
import { setupPlayersRoutes } from './players.js';
import { setupGamesRoutes } from './games.js';
import { setupStandingsRoutes } from './standings.js';
import { setupLeaguesRoutes } from './leagues.js';
import { setupRecruitingRoutes } from './recruiting.js';
import { setupAnalyticsRoutes } from './analytics.js';

export async function setupRESTRoutes(fastify: FastifyInstance, redis: Redis) {
  // API versioning
  await fastify.register(async function v1Routes(fastify) {
    // Common route options
    const routeOptions = {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['API v1'],
        security: [{ bearerAuth: [] }]
      }
    };

    // ========================================================================
    // LEAGUES ENDPOINTS
    // ========================================================================
    // GET /v1/leagues
    // GET /v1/leagues/:leagueId
    // GET /v1/leagues/:leagueId/seasons
    await setupLeaguesRoutes(fastify, redis);

    // ========================================================================
    // TEAMS ENDPOINTS
    // ========================================================================
    // GET /v1/:league/:season/teams
    // GET /v1/:league/:season/teams/:teamId
    // GET /v1/:league/:season/teams/:teamId/roster
    // GET /v1/:league/:season/teams/:teamId/schedule
    // GET /v1/:league/:season/teams/:teamId/stats
    await setupTeamsRoutes(fastify, redis);

    // ========================================================================
    // PLAYERS ENDPOINTS
    // ========================================================================
    // GET /v1/:league/:season/players
    // GET /v1/:league/:season/players/:playerId
    // GET /v1/:league/:season/players/:playerId/stats
    // GET /v1/:league/:season/players/:playerId/games
    await setupPlayersRoutes(fastify, redis);

    // ========================================================================
    // GAMES ENDPOINTS
    // ========================================================================
    // GET /v1/:league/:season/games
    // GET /v1/:league/:season/games/:gameId
    // GET /v1/:league/:season/games/live
    // GET /v1/:league/:season/games/today
    // GET /v1/:league/:season/games/:gameId/boxscore
    await setupGamesRoutes(fastify, redis);

    // ========================================================================
    // STANDINGS ENDPOINTS
    // ========================================================================
    // GET /v1/:league/:season/standings
    // GET /v1/:league/:season/standings/:division
    await setupStandingsRoutes(fastify, redis);

    // ========================================================================
    // RECRUITING ENDPOINTS
    // ========================================================================
    // GET /v1/recruiting/:sport/prospects
    // GET /v1/recruiting/:sport/prospects/:prospectId
    // GET /v1/recruiting/:sport/commits
    // GET /v1/recruiting/perfect-game/tournaments
    await setupRecruitingRoutes(fastify, redis);

    // ========================================================================
    // ANALYTICS ENDPOINTS
    // ========================================================================
    // GET /v1/analytics/cardinals/readiness
    // GET /v1/analytics/titans/performance
    // GET /v1/analytics/longhorns/recruiting
    // GET /v1/analytics/grizzlies/advanced
    await setupAnalyticsRoutes(fastify, redis);

    // ========================================================================
    // SEARCH ENDPOINT
    // ========================================================================
    fastify.get('/search', {
      schema: {
        description: 'Universal search across all entities',
        tags: ['Search'],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            type: {
              type: 'string',
              enum: ['teams', 'players', 'games', 'all'],
              default: 'all',
              description: 'Entity type to search'
            },
            league: { type: 'string', description: 'Filter by league' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'number', minimum: 0, default: 0 }
          },
          required: ['q']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              results: {
                type: 'object',
                properties: {
                  teams: { type: 'array' },
                  players: { type: 'array' },
                  games: { type: 'array' }
                }
              },
              total: { type: 'number' },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                  hasMore: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }, async (request, reply) => {
      const { q, type = 'all', league, limit = 20, offset = 0 } = request.query as any;

      try {
        // Check cache first
        const cacheKey = `search:${Buffer.from(JSON.stringify({ q, type, league, limit, offset })).toString('base64')}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
          return JSON.parse(cached);
        }

        // Perform search (implementation would use search service)
        const results = await performSearch({ q, type, league, limit, offset });

        // Cache results for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(results));

        return results;
      } catch (error) {
        request.log.error('Search error:', error);
        reply.status(500);
        return {
          error: 'Search failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // ========================================================================
    // BATCH ENDPOINTS
    // ========================================================================
    fastify.post('/batch', {
      schema: {
        description: 'Batch API requests',
        tags: ['Utilities'],
        body: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  method: { type: 'string', enum: ['GET'] },
                  path: { type: 'string' }
                },
                required: ['id', 'method', 'path']
              },
              maxItems: 10
            }
          },
          required: ['requests']
        }
      }
    }, async (request, reply) => {
      const { requests } = request.body as any;
      const results: any[] = [];

      for (const req of requests) {
        try {
          // Make internal request
          const response = await fastify.inject({
            method: req.method,
            url: req.path,
            headers: request.headers
          });

          results.push({
            id: req.id,
            status: response.statusCode,
            data: JSON.parse(response.payload)
          });
        } catch (error) {
          results.push({
            id: req.id,
            status: 500,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { results };
    });

  }, { prefix: '/v1' });

  // ========================================================================
  // API DOCUMENTATION ROUTES
  // ========================================================================
  fastify.get('/docs', async (request, reply) => {
    const baseUrl = `${request.protocol}://${request.hostname}`;

    return {
      title: 'Blaze Sports Intelligence API Documentation',
      version: '1.0.0',
      description: 'The Deep South\'s comprehensive sports data API',
      baseUrl: `${baseUrl}/v1`,
      endpoints: {
        leagues: {
          'GET /leagues': 'List all available leagues',
          'GET /leagues/{leagueId}': 'Get league details',
          'GET /leagues/{leagueId}/seasons': 'Get league seasons'
        },
        teams: {
          'GET /{league}/{season}/teams': 'List teams in league/season',
          'GET /{league}/{season}/teams/{teamId}': 'Get team details',
          'GET /{league}/{season}/teams/{teamId}/roster': 'Get team roster',
          'GET /{league}/{season}/teams/{teamId}/schedule': 'Get team schedule',
          'GET /{league}/{season}/teams/{teamId}/stats': 'Get team statistics'
        },
        players: {
          'GET /{league}/{season}/players': 'List players in league/season',
          'GET /{league}/{season}/players/{playerId}': 'Get player details',
          'GET /{league}/{season}/players/{playerId}/stats': 'Get player statistics',
          'GET /{league}/{season}/players/{playerId}/games': 'Get player game log'
        },
        games: {
          'GET /{league}/{season}/games': 'List games in league/season',
          'GET /{league}/{season}/games/{gameId}': 'Get game details',
          'GET /{league}/{season}/games/live': 'Get live games',
          'GET /{league}/{season}/games/today': 'Get today\'s games',
          'GET /{league}/{season}/games/{gameId}/boxscore': 'Get game boxscore'
        },
        standings: {
          'GET /{league}/{season}/standings': 'Get league standings',
          'GET /{league}/{season}/standings/{division}': 'Get division standings'
        },
        recruiting: {
          'GET /recruiting/{sport}/prospects': 'List recruiting prospects',
          'GET /recruiting/{sport}/prospects/{prospectId}': 'Get prospect details',
          'GET /recruiting/{sport}/commits': 'Get recent commits',
          'GET /recruiting/perfect-game/tournaments': 'Get Perfect Game tournaments'
        },
        analytics: {
          'GET /analytics/cardinals/readiness': 'Cardinals readiness metrics',
          'GET /analytics/titans/performance': 'Titans performance analytics',
          'GET /analytics/longhorns/recruiting': 'Longhorns recruiting analytics',
          'GET /analytics/grizzlies/advanced': 'Grizzlies advanced metrics'
        },
        utilities: {
          'GET /search': 'Universal search',
          'POST /batch': 'Batch requests'
        }
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <token>',
        note: 'API key required for all endpoints'
      },
      rateLimit: '1000 requests per minute per IP',
      examples: {
        'Cardinals Roster': `${baseUrl}/v1/mlb/2025/teams/cardinals/roster`,
        'Texas HS Football Teams': `${baseUrl}/v1/texas-hs-football/2024/teams?classification=6A`,
        'Perfect Game Tournaments': `${baseUrl}/v1/recruiting/perfect-game/tournaments?state=TX`,
        'Live MLB Games': `${baseUrl}/v1/mlb/2025/games/live`,
        'Universal Search': `${baseUrl}/v1/search?q=Austin&type=players`
      }
    };
  });
}

// Helper function for search (mock implementation)
async function performSearch(params: any) {
  const { q, type, league, limit, offset } = params;

  // Mock search results
  const mockResults = {
    query: q,
    results: {
      teams: type === 'all' || type === 'teams' ? [
        { id: 'cardinals', name: 'St. Louis Cardinals', league: 'mlb' }
      ] : [],
      players: type === 'all' || type === 'players' ? [
        { id: 'example-player', name: 'Example Player', team: 'Cardinals', position: 'P' }
      ] : [],
      games: type === 'all' || type === 'games' ? [
        { id: 'example-game', home: 'Cardinals', away: 'Titans', date: '2025-09-25' }
      ] : []
    },
    total: 3,
    pagination: {
      limit,
      offset,
      hasMore: false
    }
  };

  return mockResults;
}