import { FastifyInstance } from 'fastify';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../middleware/error';
import prisma from '../lib/prisma';

export async function gameRoutes(fastify: FastifyInstance) {
  // Get all games with filters
  fastify.get(
    '/games',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const {
        leagueId,
        seasonId,
        teamId,
        status,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = request.query as any;

      const where: any = {};

      if (leagueId) where.leagueId = leagueId;
      if (seasonId) where.seasonId = seasonId;
      if (status) where.status = status;
      if (teamId) {
        where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }];
      }
      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = new Date(startDate);
        if (endDate) where.scheduledAt.lte = new Date(endDate);
      }

      const [games, total] = await Promise.all([
        prisma.game.findMany({
          where,
          include: {
            league: {
              select: { id: true, name: true, sport: true },
            },
            homeTeam: {
              select: { id: true, name: true, shortName: true, logoUrl: true },
            },
            awayTeam: {
              select: { id: true, name: true, shortName: true, logoUrl: true },
            },
          },
          take: Number(limit),
          skip: Number(offset),
          orderBy: { scheduledAt: 'desc' },
        }),
        prisma.game.count({ where }),
      ]);

      return reply.send({
        data: games,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    }
  );

  // Get game by ID
  fastify.get(
    '/games/:id',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const game = await prisma.game.findUnique({
        where: { id },
        include: {
          league: true,
          season: true,
          homeTeam: true,
          awayTeam: true,
          stats: {
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  jerseyNumber: true,
                  position: true,
                },
              },
            },
          },
          events: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      if (!game) {
        throw new NotFoundError('Game not found');
      }

      return reply.send({ data: game });
    }
  );

  // Create new game (authenticated)
  fastify.post(
    '/games',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const data = request.body as any;

      // Validate required fields
      if (
        !data.leagueId ||
        !data.homeTeamId ||
        !data.awayTeamId ||
        !data.scheduledAt
      ) {
        throw new ValidationError(
          'League, home team, away team, and scheduled time are required'
        );
      }

      if (data.homeTeamId === data.awayTeamId) {
        throw new ValidationError('Home and away teams must be different');
      }

      const game = await prisma.game.create({
        data,
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      });

      return reply.code(201).send({ data: game });
    }
  );

  // Update game (authenticated)
  fastify.patch(
    '/games/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const game = await prisma.game.update({
        where: { id },
        data,
        include: {
          homeTeam: true,
          awayTeam: true,
          league: true,
        },
      });

      return reply.send({ data: game });
    }
  );

  // Get live games
  fastify.get(
    '/games/live',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const games = await prisma.game.findMany({
        where: {
          status: 'LIVE',
        },
        include: {
          league: true,
          homeTeam: true,
          awayTeam: true,
        },
        orderBy: { startedAt: 'desc' },
      });

      return reply.send({ data: games });
    }
  );

  // Add game event (authenticated)
  fastify.post(
    '/games/:id/events',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const event = await prisma.gameEvent.create({
        data: {
          ...data,
          gameId: id,
        },
      });

      return reply.code(201).send({ data: event });
    }
  );
}
