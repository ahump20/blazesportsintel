import { FastifyInstance } from 'fastify';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import prisma from '../lib/prisma';

export async function recruitingRoutes(fastify: FastifyInstance) {
  // Get recruiting profiles with filters
  fastify.get(
    '/recruiting',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const {
        recruitingClass,
        position,
        stars,
        minRanking,
        maxRanking,
        limit = 50,
        offset = 0,
      } = request.query as any;

      const where: any = {};

      if (recruitingClass) where.recruitingClass = Number(recruitingClass);
      if (position) where.position = position;
      if (stars) where.stars = Number(stars);
      if (minRanking || maxRanking) {
        where.ranking = {};
        if (minRanking) where.ranking.gte = Number(minRanking);
        if (maxRanking) where.ranking.lte = Number(maxRanking);
      }

      const [profiles, total] = await Promise.all([
        prisma.recruitingProfile.findMany({
          where,
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                fullName: true,
                profileImageUrl: true,
                hometown: true,
                highSchool: true,
              },
            },
          },
          take: Number(limit),
          skip: Number(offset),
          orderBy: [{ stars: 'desc' }, { ranking: 'asc' }],
        }),
        prisma.recruitingProfile.count({ where }),
      ]);

      return reply.send({
        data: profiles,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    }
  );

  // Get recruiting profile by player ID
  fastify.get(
    '/recruiting/player/:playerId',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { playerId } = request.params as { playerId: string };

      const profile = await prisma.recruitingProfile.findUnique({
        where: { playerId },
        include: {
          player: true,
        },
      });

      if (!profile) {
        throw new NotFoundError('Recruiting profile not found');
      }

      return reply.send({ data: profile });
    }
  );

  // Create recruiting profile (authenticated)
  fastify.post(
    '/recruiting',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const data = request.body as any;

      const profile = await prisma.recruitingProfile.create({
        data,
        include: { player: true },
      });

      return reply.code(201).send({ data: profile });
    }
  );

  // Update recruiting profile (authenticated)
  fastify.patch(
    '/recruiting/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const profile = await prisma.recruitingProfile.update({
        where: { id },
        data,
        include: { player: true },
      });

      return reply.send({ data: profile });
    }
  );

  // Get top recruits by class
  fastify.get(
    '/recruiting/top/:year',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { year } = request.params as { year: string };
      const { position, limit = 100 } = request.query as any;

      const where: any = {
        recruitingClass: Number(year),
      };

      if (position) where.position = position;

      const profiles = await prisma.recruitingProfile.findMany({
        where,
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              profileImageUrl: true,
              hometown: true,
              highSchool: true,
            },
          },
        },
        take: Number(limit),
        orderBy: [{ stars: 'desc' }, { ranking: 'asc' }],
      });

      return reply.send({ data: profiles });
    }
  );

  // Get commits by school
  fastify.get(
    '/recruiting/commits/:school',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { school } = request.params as { school: string };
      const { year } = request.query as any;

      const where: any = {
        committedTo: school,
      };

      if (year) where.recruitingClass = Number(year);

      const commits = await prisma.recruitingProfile.findMany({
        where,
        include: {
          player: true,
        },
        orderBy: [{ stars: 'desc' }, { ranking: 'asc' }],
      });

      return reply.send({ data: commits });
    }
  );
}
