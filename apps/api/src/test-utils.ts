import { FastifyInstance } from 'fastify';
import { build } from './server';

/**
 * Create a test Fastify instance
 */
export async function createTestServer(): Promise<FastifyInstance> {
  const app = await build({ logger: false });
  return app;
}

/**
 * Clean up test server
 */
export async function closeTestServer(app: FastifyInstance): Promise<void> {
  await app.close();
}

/**
 * Mock authentication token generator
 */
export function generateTestToken(payload: Record<string, any> = {}): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: 'test-user-id', email: 'test@example.com', ...payload },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}
