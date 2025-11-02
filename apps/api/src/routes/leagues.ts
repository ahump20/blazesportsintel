import { FastifyInstance } from 'fastify';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import prisma from '../lib/prisma';

export async function leagueRoutes(fastify: FastifyInstance) {
  // Get all leagues
  fastify.get(
    '/leagues',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { sport, level, isActive = true } = request.query as any;

      const where: any = {};
      if (sport) where.sport = sport;
      if (level) where.level = level;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const leagues = await prisma.league.findMany({
        where,
        include: {
          _count: {
            select: { teams: true, games: true, seasons: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return reply.send({ data: leagues });
    }
  );

  // Get league by ID
  fastify.get(
    '/leagues/:id',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const league = await prisma.league.findUnique({
        where: { id },
        include: {
          teams: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
          seasons: {
            orderBy: { year: 'desc' },
            take: 5,
          },
          _count: {
            select: { games: true },
          },
        },
      });

      if (!league) {
        throw new NotFoundError('League not found');
      }

      return reply.send({ data: league });
    }
  );

  // Create league (authenticated)
  fastify.post(
    '/leagues',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const data = request.body as any;

      const league = await prisma.league.create({
        data,
      });

      return reply.code(201).send({ data: league });
    }
  );

  // Update league (authenticated)
  fastify.patch(
    '/leagues/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = request.body as any;

      const league = await prisma.league.update({
        where: { id },
        data,
      });

      return reply.send({ data: league });
    }
  );

  // Get league standings
  fastify.get(
    '/leagues/:id/standings',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { seasonId } = request.query as any;

      // Get teams in league
      const teams = await prisma.team.findMany({
        where: { leagueId: id, isActive: true },
        select: { id: true, name: true, shortName: true, logoUrl: true },
      });

      // Calculate standings
      const standings = await Promise.all(
        teams.map(async (team) => {
          const where: any = {
            OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
            status: 'FINAL',
          };
          if (seasonId) where.seasonId = seasonId;

          const games = await prisma.game.findMany({ where });

          let wins = 0;
          let losses = 0;
          let pointsFor = 0;
          let pointsAgainst = 0;

          games.forEach((game) => {
            const isHome = game.homeTeamId === team.id;
            const teamScore = isHome ? game.homeScore : game.awayScore;
            const oppScore = isHome ? game.awayScore : game.homeScore;

            if (teamScore !== null && oppScore !== null) {
              pointsFor += teamScore;
              pointsAgainst += oppScore;

              if (teamScore > oppScore) wins++;
              else if (teamScore < oppScore) losses++;
            }
          });

          return {
            team,
            wins,
            losses,
            gamesPlayed: wins + losses,
            winPercentage: wins + losses > 0 ? wins / (wins + losses) : 0,
            pointsFor,
            pointsAgainst,
            pointDifferential: pointsFor - pointsAgainst,
          };
        })
      );

      // Sort by win percentage
      standings.sort((a, b) => b.winPercentage - a.winPercentage);

      return reply.send({ data: standings });
    }
  );
}
