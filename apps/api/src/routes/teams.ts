/**
 * Teams API Routes
 * RESTful endpoints for team data across all leagues
 */

import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { TeamSchema, PlayerSchema } from '@blazesportsintel/schemas';

export async function setupTeamsRoutes(fastify: FastifyInstance, redis: Redis) {

  // ========================================================================
  // GET /:league/:season/teams
  // List all teams in a league/season
  // ========================================================================
  fastify.get('/:league/:season/teams', {
    schema: {
      description: 'Get all teams in a league/season',
      tags: ['Teams'],
      params: {
        type: 'object',
        properties: {
          league: {
            type: 'string',
            enum: ['mlb', 'nfl', 'nba', 'ncaa-football', 'ncaa-baseball', 'texas-hs-football', 'perfect-game'],
            description: 'League identifier'
          },
          season: {
            type: 'string',
            pattern: '^(19|20)\\d{2}$',
            description: 'Season year (e.g., 2025)'
          }
        },
        required: ['league', 'season']
      },
      querystring: {
        type: 'object',
        properties: {
          conference: { type: 'string', description: 'Filter by conference/division' },
          district: { type: 'string', description: 'Filter by district (high school)' },
          classification: { type: 'string', description: 'Filter by classification (e.g., 6A, 5A)' },
          state: { type: 'string', description: 'Filter by state' },
          active: { type: 'boolean', default: true, description: 'Include only active teams' },
          limit: { type: 'number', minimum: 1, maximum: 500, default: 100 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            teams: { type: 'array' },
            total: { type: 'number' },
            pagination: {
              type: 'object',
              properties: {
                limit: { type: 'number' },
                offset: { type: 'number' },
                hasMore: { type: 'boolean' }
              }
            },
            metadata: {
              type: 'object',
              properties: {
                league: { type: 'string' },
                season: { type: 'string' },
                lastUpdated: { type: 'string' },
                coverage: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { league, season } = request.params as any;
    const {
      conference,
      district,
      classification,
      state,
      active = true,
      limit = 100,
      offset = 0
    } = request.query as any;

    try {
      const cacheKey = `teams:${league}:${season}:${JSON.stringify(request.query)}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Load teams data based on league
      const teams = await loadTeams(league, season, {
        conference,
        district,
        classification,
        state,
        active,
        limit,
        offset
      });

      const response = {
        teams: teams.data.slice(offset, offset + limit),
        total: teams.total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < teams.total
        },
        metadata: {
          league,
          season,
          lastUpdated: teams.lastUpdated,
          coverage: getCoverageDescription(league)
        }
      };

      // Cache for 10 minutes
      await redis.setex(cacheKey, 600, JSON.stringify(response));

      return response;

    } catch (error) {
      request.log.error('Teams fetch error:', error);
      reply.status(500);
      return {
        error: 'Failed to fetch teams',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ========================================================================
  // GET /:league/:season/teams/:teamId
  // Get specific team details
  // ========================================================================
  fastify.get('/:league/:season/teams/:teamId', {
    schema: {
      description: 'Get detailed information for a specific team',
      tags: ['Teams'],
      params: {
        type: 'object',
        properties: {
          league: { type: 'string' },
          season: { type: 'string' },
          teamId: { type: 'string', description: 'Team identifier' }
        },
        required: ['league', 'season', 'teamId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            team: { type: 'object' },
            stats: { type: 'object' },
            linkouts: { type: 'array' },
            metadata: { type: 'object' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { league, season, teamId } = request.params as any;

    try {
      const cacheKey = `team:${league}:${season}:${teamId}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const team = await loadTeamDetails(league, season, teamId);

      if (!team) {
        reply.status(404);
        return {
          error: 'Team not found',
          message: `Team ${teamId} not found in ${league} ${season}`
        };
      }

      const response = {
        team: team.data,
        stats: team.stats,
        linkouts: generateTeamLinkouts(team.data, league),
        metadata: {
          league,
          season,
          teamId,
          lastUpdated: team.lastUpdated,
          nextGame: team.nextGame,
          record: team.record
        }
      };

      // Cache for 15 minutes
      await redis.setex(cacheKey, 900, JSON.stringify(response));

      return response;

    } catch (error) {
      request.log.error('Team detail error:', error);
      reply.status(500);
      return {
        error: 'Failed to fetch team details',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ========================================================================
  // GET /:league/:season/teams/:teamId/roster
  // Get team roster with player details
  // ========================================================================
  fastify.get('/:league/:season/teams/:teamId/roster', {
    schema: {
      description: 'Get complete roster for a team',
      tags: ['Teams', 'Players'],
      params: {
        type: 'object',
        properties: {
          league: { type: 'string' },
          season: { type: 'string' },
          teamId: { type: 'string' }
        },
        required: ['league', 'season', 'teamId']
      },
      querystring: {
        type: 'object',
        properties: {
          position: { type: 'string', description: 'Filter by position' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'injured', 'all'],
            default: 'active'
          },
          includeStats: { type: 'boolean', default: false, description: 'Include player statistics' }
        }
      }
    }
  }, async (request, reply) => {
    const { league, season, teamId } = request.params as any;
    const { position, status = 'active', includeStats = false } = request.query as any;

    try {
      const cacheKey = `roster:${league}:${season}:${teamId}:${position || 'all'}:${status}:${includeStats}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const roster = await loadTeamRoster(league, season, teamId, {
        position,
        status,
        includeStats
      });

      if (!roster) {
        reply.status(404);
        return {
          error: 'Team not found',
          message: `Team ${teamId} not found in ${league} ${season}`
        };
      }

      const response = {
        teamId,
        players: roster.players.map(player => ({
          ...player,
          linkouts: generatePlayerLinkouts(player, league)
        })),
        coaching: roster.coaching || [],
        total: roster.total,
        byPosition: roster.byPosition,
        metadata: {
          league,
          season,
          teamId,
          lastUpdated: roster.lastUpdated,
          filters: { position, status, includeStats }
        }
      };

      // Cache for 20 minutes
      await redis.setex(cacheKey, 1200, JSON.stringify(response));

      return response;

    } catch (error) {
      request.log.error('Roster fetch error:', error);
      reply.status(500);
      return {
        error: 'Failed to fetch roster',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ========================================================================
  // GET /:league/:season/teams/:teamId/schedule
  // Get team schedule and results
  // ========================================================================
  fastify.get('/:league/:season/teams/:teamId/schedule', {
    schema: {
      description: 'Get team schedule and game results',
      tags: ['Teams', 'Games'],
      params: {
        type: 'object',
        properties: {
          league: { type: 'string' },
          season: { type: 'string' },
          teamId: { type: 'string' }
        },
        required: ['league', 'season', 'teamId']
      },
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['all', 'scheduled', 'completed', 'live'],
            default: 'all'
          },
          gameType: {
            type: 'string',
            enum: ['all', 'regular', 'playoff', 'conference', 'district'],
            default: 'all'
          },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    const { league, season, teamId } = request.params as any;
    const { status = 'all', gameType = 'all', startDate, endDate } = request.query as any;

    try {
      const cacheKey = `schedule:${league}:${season}:${teamId}:${status}:${gameType}:${startDate || ''}:${endDate || ''}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const schedule = await loadTeamSchedule(league, season, teamId, {
        status,
        gameType,
        startDate,
        endDate
      });

      if (!schedule) {
        reply.status(404);
        return {
          error: 'Team not found',
          message: `Team ${teamId} not found in ${league} ${season}`
        };
      }

      const response = {
        teamId,
        games: schedule.games,
        record: schedule.record,
        upcoming: schedule.upcoming,
        recent: schedule.recent,
        totals: schedule.totals,
        metadata: {
          league,
          season,
          teamId,
          lastUpdated: schedule.lastUpdated,
          filters: { status, gameType, startDate, endDate }
        }
      };

      // Cache for 5 minutes (more frequent updates for schedules)
      await redis.setex(cacheKey, 300, JSON.stringify(response));

      return response;

    } catch (error) {
      request.log.error('Schedule fetch error:', error);
      reply.status(500);
      return {
        error: 'Failed to fetch schedule',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // ========================================================================
  // GET /:league/:season/teams/:teamId/stats
  // Get team statistics and analytics
  // ========================================================================
  fastify.get('/:league/:season/teams/:teamId/stats', {
    schema: {
      description: 'Get comprehensive team statistics',
      tags: ['Teams', 'Statistics'],
      params: {
        type: 'object',
        properties: {
          league: { type: 'string' },
          season: { type: 'string' },
          teamId: { type: 'string' }
        },
        required: ['league', 'season', 'teamId']
      },
      querystring: {
        type: 'object',
        properties: {
          split: {
            type: 'string',
            enum: ['overall', 'home', 'away', 'conference', 'recent'],
            default: 'overall'
          },
          gameType: { type: 'string', enum: ['all', 'regular', 'playoff'], default: 'all' },
          advanced: { type: 'boolean', default: false, description: 'Include advanced analytics' }
        }
      }
    }
  }, async (request, reply) => {
    const { league, season, teamId } = request.params as any;
    const { split = 'overall', gameType = 'all', advanced = false } = request.query as any;

    try {
      const cacheKey = `stats:${league}:${season}:${teamId}:${split}:${gameType}:${advanced}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const stats = await loadTeamStats(league, season, teamId, {
        split,
        gameType,
        advanced
      });

      if (!stats) {
        reply.status(404);
        return {
          error: 'Team not found',
          message: `Team ${teamId} not found in ${league} ${season}`
        };
      }

      const response = {
        teamId,
        stats: stats.data,
        rankings: stats.rankings,
        trends: stats.trends,
        advanced: advanced ? stats.advanced : undefined,
        comparisons: stats.comparisons,
        metadata: {
          league,
          season,
          teamId,
          split,
          gameType,
          lastUpdated: stats.lastUpdated,
          sampleSize: stats.sampleSize
        }
      };

      // Cache for 15 minutes
      await redis.setex(cacheKey, 900, JSON.stringify(response));

      return response;

    } catch (error) {
      request.log.error('Team stats error:', error);
      reply.status(500);
      return {
        error: 'Failed to fetch team statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadTeams(league: string, season: string, filters: any) {
  // Implementation would load from data store
  return {
    data: [],
    total: 0,
    lastUpdated: new Date().toISOString()
  };
}

async function loadTeamDetails(league: string, season: string, teamId: string) {
  // Implementation would load team details
  return null;
}

async function loadTeamRoster(league: string, season: string, teamId: string, options: any) {
  // Implementation would load roster
  return null;
}

async function loadTeamSchedule(league: string, season: string, teamId: string, options: any) {
  // Implementation would load schedule
  return null;
}

async function loadTeamStats(league: string, season: string, teamId: string, options: any) {
  // Implementation would load stats
  return null;
}

function getCoverageDescription(league: string): string {
  const coverage: { [key: string]: string } = {
    'mlb': 'Major League Baseball - All 30 teams',
    'nfl': 'National Football League - All 32 teams',
    'nba': 'National Basketball Association - All 30 teams',
    'ncaa-football': 'NCAA Football - FBS conferences (SEC, Big 12, etc.)',
    'ncaa-baseball': 'NCAA Baseball - Division I programs',
    'texas-hs-football': 'Texas High School Football - 1,400+ UIL schools',
    'perfect-game': 'Perfect Game Baseball - Youth tournaments (14U+)'
  };

  return coverage[league] || 'Sports league coverage';
}

function generateTeamLinkouts(team: any, league: string) {
  const linkouts = [];

  // Official team website
  if (team.contact?.website) {
    linkouts.push({
      title: 'Official Website',
      url: team.contact.website,
      type: 'official',
      priority: 10
    });
  }

  // League-specific linkouts
  switch (league) {
    case 'mlb':
      linkouts.push({
        title: 'Baseball Reference',
        url: `https://baseball-reference.com/teams/${team.abbreviation}/`,
        type: 'stats',
        priority: 9
      });
      break;
    case 'texas-hs-football':
      if (team.externalRefs?.find((ref: any) => ref.type === 'dctf')) {
        linkouts.push({
          title: 'Dave Campbell\'s Texas Football',
          url: team.externalRefs.find((ref: any) => ref.type === 'dctf').url,
          type: 'official',
          priority: 9
        });
      }
      break;
  }

  return linkouts.sort((a, b) => b.priority - a.priority);
}

function generatePlayerLinkouts(player: any, league: string) {
  // Similar to team linkouts but for players
  return [];
}