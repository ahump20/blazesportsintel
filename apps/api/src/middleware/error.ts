/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - ERROR HANDLING MIDDLEWARE
 * =============================================================================
 * Centralized error handling and logging
 * User-friendly error responses
 * =============================================================================
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export async function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // Log error details
  request.log.error({
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date().toISOString()
  }, 'Request error');

  // Determine status code
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';

  // Handle specific error types
  if (error.code === 'FST_ERR_VALIDATION') {
    statusCode = 400;
    message = 'Validation error';
  } else if (error.code === 'FST_ERR_NOT_FOUND') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (error.code === 'FST_ERR_BAD_REQUEST') {
    statusCode = 400;
    message = 'Bad request';
  }

  // Send error response
  reply.status(statusCode).send({
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url
  });
}