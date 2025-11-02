import { FastifyInstance } from 'fastify';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { NotFoundError } from '../middleware/error';
import prisma from '../lib/prisma';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Get player analytics
  fastify.get(
    '/analytics/player/:playerId',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { playerId } = request.params as { playerId: string };
      const { analyticsType } = request.query as any;

      const where: any = { playerId };
      if (analyticsType) where.analyticsType = analyticsType;

      const analytics = await prisma.playerAnalytics.findMany({
        where,
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
        },
        orderBy: { computedAt: 'desc' },
      });

      return reply.send({ data: analytics });
    }
  );

  // Get computed features
  fastify.get(
    '/analytics/features',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { entityType, entityId, featureName } = request.query as any;

      const where: any = {};
      if (entityType) where.entityType = entityType;
      if (entityId) where.entityId = entityId;
      if (featureName) where.featureName = featureName;

      // Only get non-expired features
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];

      const features = await prisma.computedFeature.findMany({
        where,
        orderBy: { computedAt: 'desc' },
      });

      return reply.send({ data: features });
    }
  );

  // Compute and store player analytics (authenticated)
  fastify.post(
    '/analytics/player/:playerId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { playerId } = request.params as { playerId: string };
      const { analyticsType, value, confidence, metadata, validUntil } =
        request.body as any;

      const analytics = await prisma.playerAnalytics.create({
        data: {
          playerId,
          analyticsType,
          value,
          confidence,
          metadata: metadata || {},
          validUntil: validUntil ? new Date(validUntil) : undefined,
        },
        include: { player: true },
      });

      return reply.code(201).send({ data: analytics });
    }
  );

  // Compute and store feature (authenticated)
  fastify.post(
    '/analytics/features',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { entityType, entityId, featureName, value, expiresAt, metadata } =
        request.body as any;

      const feature = await prisma.computedFeature.upsert({
        where: {
          entityType_entityId_featureName: {
            entityType,
            entityId,
            featureName,
          },
        },
        update: {
          value,
          computedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          metadata: metadata || {},
        },
        create: {
          entityType,
          entityId,
          featureName,
          value,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          metadata: metadata || {},
        },
      });

      return reply.code(201).send({ data: feature });
    }
  );

  // Vision AI analysis
  fastify.post(
    '/analytics/vision',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const {
        playerId,
        sessionId,
        analysisType,
        videoUrl,
        frameCount,
        keypoints,
        metrics,
        characterScore,
        recommendations,
        processingTime,
      } = request.body as any;

      const analysis = await prisma.visionAnalysis.create({
        data: {
          playerId,
          sessionId,
          analysisType,
          videoUrl,
          frameCount,
          keypoints,
          metrics,
          characterScore,
          recommendations: recommendations || [],
          processingTime,
        },
        include: playerId
          ? {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  fullName: true,
                },
              },
            }
          : undefined,
      });

      return reply.code(201).send({ data: analysis });
    }
  );

  // Get vision analysis by session
  fastify.get(
    '/analytics/vision/:sessionId',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };

      const analyses = await prisma.visionAnalysis.findMany({
        where: { sessionId },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ data: analyses });
    }
  );

  // Get team analytics summary
  fastify.get(
    '/analytics/team/:teamId',
    { preHandler: optionalAuthMiddleware },
    async (request, reply) => {
      const { teamId } = request.params as { teamId: string };

      // Get team players
      const players = await prisma.player.findMany({
        where: { teamId, isActive: true },
        select: { id: true },
      });

      const playerIds = players.map((p) => p.id);

      // Get analytics for all players
      const analytics = await prisma.playerAnalytics.findMany({
        where: {
          playerId: { in: playerIds },
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              position: true,
            },
          },
        },
        orderBy: { computedAt: 'desc' },
      });

      // Group by analytics type
      const grouped = analytics.reduce((acc, item) => {
        if (!acc[item.analyticsType]) {
          acc[item.analyticsType] = [];
        }
        acc[item.analyticsType].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      return reply.send({
        data: {
          teamId,
          playerCount: playerIds.length,
          analyticsTypes: Object.keys(grouped),
          analytics: grouped,
        },
      });
    }
  );
}
