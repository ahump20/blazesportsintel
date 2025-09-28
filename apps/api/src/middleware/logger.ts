/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - LOGGING MIDDLEWARE
 * =============================================================================
 * Advanced request logging and performance monitoring
 * Structured logging for analytics and debugging
 * =============================================================================
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export async function loggerMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();
  
  // Log request details
  request.log.info({
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    timestamp: new Date().toISOString()
  }, 'Incoming request');
  
  // Track response time
  reply.raw.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      timestamp: new Date().toISOString()
    }, 'Request completed');
  });
}