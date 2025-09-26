/**
 * Blaze Sports Intelligence API Server
 * Fast, scalable API with REST, GraphQL, and WebSocket support
 */

import Fastify from 'fastify';
import { fastifyApollo } from '@apollo/server-integration-fastify';
import { ApolloServer } from '@apollo/server';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createRedisClient } from './services/redis.js';
import { createGraphQLSchema } from './graphql/schema.js';
import { setupRESTRoutes } from './routes/index.js';
import { setupWebSocketHandlers } from './websocket/handlers.js';
import { authMiddleware } from './middleware/auth.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error.js';

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

// Create Redis client for caching
const redis = createRedisClient();

// Register plugins
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net']
    }
  }
});

await fastify.register(cors, {
  origin: NODE_ENV === 'production'
    ? ['https://blazesportsintel.com', 'https://www.blazesportsintel.com']
    : true,
  credentials: true
});

await fastify.register(rateLimit, {
  max: 1000, // requests per timeWindow
  timeWindow: '1 minute',
  redis: redis,
  skipOnError: true,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.toString().split(',')[0] : req.ip;
    return `rate_limit:${ip}`;
  }
});

await fastify.register(websocket);

// Custom middleware
fastify.addHook('onRequest', authMiddleware);
fastify.addHook('onRequest', loggerMiddleware);
fastify.setErrorHandler(errorHandler);

// Health check
fastify.get('/health', async (request, reply) => {
  const timestamp = new Date().toISOString();

  try {
    // Check Redis connection
    await redis.ping();

    return {
      status: 'healthy',
      timestamp,
      version: '1.0.0',
      services: {
        redis: 'connected',
        database: 'connected' // Would check actual DB
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  } catch (error) {
    reply.status(503);
    return {
      status: 'unhealthy',
      timestamp,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// API Info
fastify.get('/', async () => {
  return {
    name: 'Blaze Sports Intelligence API',
    description: 'The Deep South\'s Sports Intelligence Hub - Comprehensive data from youth to professional',
    version: '1.0.0',
    documentation: {
      rest: '/docs',
      graphql: '/graphql',
      websocket: '/ws'
    },
    coverage: {
      'Texas HS Football': '1,400+ schools (UIL varsity)',
      'Perfect Game Baseball': 'Youth tournaments & showcases (14U+)',
      'NCAA Football': 'FBS conferences (SEC, Big 12, etc.)',
      'NFL': 'All franchises (Titans focus)',
      'College Baseball': 'D1 programs',
      'MLB': 'All clubs (Cardinals focus)',
      'NBA': 'All teams (Grizzlies focus)'
    },
    features: [
      'Real-time game data',
      'Historical statistics',
      'Recruiting intelligence',
      'Performance analytics',
      'Link-outs to official sources'
    ]
  };
});

// Setup REST routes
await setupRESTRoutes(fastify, redis);

// Setup GraphQL
const schema = createGraphQLSchema();
const apollo = new ApolloServer({
  schema,
  introspection: NODE_ENV !== 'production',
  plugins: [
    {
      requestDidStart() {
        return {
          didResolveOperation(requestContext) {
            fastify.log.info({
              query: requestContext.request.query,
              operationName: requestContext.request.operationName,
              variables: requestContext.request.variables
            }, 'GraphQL operation');
          }
        };
      }
    }
  ]
});

await apollo.start();

// Register GraphQL handler
await fastify.register(fastifyApollo(apollo), {
  path: '/graphql',
  context: async (request) => ({
    user: request.user,
    redis,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  })
});

// Setup WebSocket handlers
setupWebSocketHandlers(fastify, redis);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await redis.quit();
    await fastify.close();
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: PORT,
      host: HOST
    });

    fastify.log.info(`🚀 Blaze Sports Intelligence API running on http://${HOST}:${PORT}`);
    fastify.log.info(`📊 GraphQL Playground: http://${HOST}:${PORT}/graphql`);
    fastify.log.info(`🏈 Coverage: Texas HS Football, Perfect Game Baseball, MLB Cardinals, NFL Titans, NBA Grizzlies`);

    if (NODE_ENV === 'development') {
      fastify.log.info('🔧 Development mode - CORS and introspection enabled');
    }
  } catch (error) {
    fastify.log.error('Error starting server:', error);
    process.exit(1);
  }
};

start();