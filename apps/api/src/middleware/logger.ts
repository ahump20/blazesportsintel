import pino from 'pino';
import { FastifyRequest } from 'fastify';

/**
 * Create production-ready Pino logger configuration
 */
export function createLogger() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';

  // Suppress logs in test environment
  if (isTest) {
    return pino({ level: 'silent' });
  }

  return pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    serializers: {
      req: (req: FastifyRequest) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        remoteAddress: req.ip,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
        },
      }),
      err: pino.stdSerializers.err,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  });
}

/**
 * Request logging configuration for Fastify
 */
export const loggerConfig = {
  logger: createLogger(),
  disableRequestLogging: false,
  requestIdLogLabel: 'requestId',
};

/**
 * Custom request logger options
 */
export const requestLoggerOptions = {
  serializers: {
    req(request: FastifyRequest) {
      return {
        id: request.id,
        method: request.method,
        url: request.url,
        path: request.routerPath,
        parameters: request.params,
        headers: {
          host: request.headers.host,
          'user-agent': request.headers['user-agent'],
        },
        remoteAddress: request.ip,
        remotePort: request.socket?.remotePort,
      };
    },
  },
};

/**
 * Log request completion with timing
 */
export function logRequestComplete(
  request: FastifyRequest,
  responseTime: number,
  statusCode: number
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  request.log[level](
    {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    },
    'Request completed'
  );
}

/**
 * Structured logging helpers
 */
export const logger = {
  info: (message: string, data?: object) => {
    console.log(JSON.stringify({ level: 'INFO', message, ...data, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: Error | object) => {
    console.error(JSON.stringify({ level: 'ERROR', message, error, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, data?: object) => {
    console.warn(JSON.stringify({ level: 'WARN', message, ...data, timestamp: new Date().toISOString() }));
  },
  debug: (message: string, data?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify({ level: 'DEBUG', message, ...data, timestamp: new Date().toISOString() }));
    }
  },
};
