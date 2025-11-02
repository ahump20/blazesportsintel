import { FastifyInstance } from 'fastify';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../middleware/error';
import prisma from '../lib/prisma';

export async function playerRoutes(fastify: FastifyInstance) {
  // Get all players with optional filters
  fastify.get(
    '/players',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const {
        teamId,
        position,
        search,
        limit = 50,
        offset = 0,
      } = request.query as any;

      const where: any = { isActive: true };

      if (teamId) where.teamId = teamId;
      if (position) where.position = position;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [players, total] = await Promise.all([
        prisma.player.findMany({
          where,
          include: {
            team: {
              select: {
                id: true,
                name: true,
                shortName: true,
                logoUrl: true,
              },
            },
          },
          take: Number(limit),
          skip: Number(offset),
          orderBy: { lastName: 'asc' },
        }),
        prisma.player.count({ where }),
      ]);

      return reply.send({
        data: players,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    }
  );

  // Get player by ID
  fastify.get(
    '/players/:id',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const player = await prisma.player.findUnique({
        where: { id },
        include: {
          team: true,
          stats: {
            take: 10,
            orderBy: { recordedAt: 'desc' },
          },
          analytics: {
            take: 10,
            orderBy: { computedAt: 'desc' },
          },
          recruiting: true,
          visionAnalysis: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!player) {
        throw new NotFoundError('Player not found');
      }

      return reply.send({ data: player });
    }
  );

  // Create new player (authenticated)
  fastify.post(
    '/players',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const data = request.body as any;

      // Validate required fields
      if (!data.firstName || !data.lastName) {
        throw new ValidationError('First name and last name are required');
      }

      const player = await prisma.player.create({
        data: {
          ...data,
          fullName: `${data.firstName} ${data.lastName}`,
        },
        include: { team: true },
      });

      return reply.code(201).send({ data: player });
    }
  );

  // Update player (authenticated)
  fastify.patch(
    '/players/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      // Update fullName if first or last name changed
      if (data.firstName || data.lastName) {
        const existing = await prisma.player.findUnique({
          where: { id },
          select: { firstName: true, lastName: true },
        });

        if (!existing) {
          throw new NotFoundError('Player not found');
        }

        data.fullName = `${data.firstName || existing.firstName} ${
          data.lastName || existing.lastName
        }`;
      }

      const player = await prisma.player.update({
        where: { id },
        data,
        include: { team: true },
      });

      return reply.send({ data: player });
    }
  );

  // Delete player (authenticated)
  fastify.delete(
    '/players/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await prisma.player.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.code(204).send();
    }
  );

  // Get player statistics
  fastify.get(
    '/players/:id/stats',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { season, statType } = request.query as any;

      const where: any = { playerId: id };
      if (season) where.season = season;
      if (statType) where.statType = statType;

      const stats = await prisma.playerStat.findMany({
        where,
        include: { game: true },
        orderBy: { recordedAt: 'desc' },
      });

      return reply.send({ data: stats });
    }
  );

  // Get player analytics
  fastify.get(
    '/players/:id/analytics',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const analytics = await prisma.playerAnalytics.findMany({
        where: { playerId: id },
        orderBy: { computedAt: 'desc' },
      });

      return reply.send({ data: analytics });
    }
  );
}
