import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { createTestServer, closeTestServer, generateTestToken } from '../../test-utils';

describe('Player Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestServer();
    authToken = generateTestToken({ id: 'test-user', email: 'test@example.com', role: 'ADMIN' });
  });

  afterAll(async () => {
    await closeTestServer(app);
  });

  describe('GET /players', () => {
    it('should return players list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/players',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('data');
      expect(response.json()).toHaveProperty('meta');
    });

    it('should filter by team', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/players?teamId=test-team-id',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /players', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/players',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          position: 'QB',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create player when authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/players',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          position: 'QB',
          teamId: 'test-team-id',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().data).toHaveProperty('id');
      expect(response.json().data.fullName).toBe('John Doe');
    });
  });
});
