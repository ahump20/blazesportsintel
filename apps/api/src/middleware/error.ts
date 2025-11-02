import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
}

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error
  request.log.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        statusCode,
        code: error.code,
      },
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
      },
    },
    'Request error'
  );

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: error.name || 'Error',
    message: isDevelopment ? error.message : getPublicErrorMessage(statusCode),
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
    requestId: request.id,
  };

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.details = {
      stack: error.stack.split('\n'),
      code: error.code,
    };
  }

  // Send error response
  reply.code(statusCode).send(errorResponse);
}

/**
 * Get public-facing error message based on status code
 */
function getPublicErrorMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return messages[statusCode] || 'An error occurred';
}

/**
 * Not found handler
 */
export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  reply.code(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: request.url,
  });
}

/**
 * Validation error formatter
 */
export function formatValidationError(error: FastifyError): ErrorResponse {
  return {
    error: 'Validation Error',
    message: 'Request validation failed',
    statusCode: 400,
    timestamp: new Date().toISOString(),
    path: '',
    details: error.validation,
  };
}

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
