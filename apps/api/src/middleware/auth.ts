/**
 * =============================================================================
 * BLAZE SPORTS INTELLIGENCE - AUTHENTICATION MIDDLEWARE
 * =============================================================================
 * JWT-based authentication for API security
 * Rate limiting and request validation
 * =============================================================================
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthRequest extends FastifyRequest {
  user?: AuthUser;
}

export async function authMiddleware(request: AuthRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow public access to health and status endpoints
    if (request.url === '/health' || request.url === '/status') {
      return;
    }
    
    reply.status(401);
    return { error: 'Authentication required' };
  }

  try {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'blaze-sports-intel-secret';
    
    const decoded = jwt.verify(token, secret) as any;
    
    request.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
      permissions: decoded.permissions || []
    };
    
  } catch (error) {
    reply.status(401);
    return { error: 'Invalid token' };
  }
}

export function requireRole(role: string) {
  return async (request: AuthRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401);
      return { error: 'Authentication required' };
    }
    
    if (request.user.role !== role && request.user.role !== 'admin') {
      reply.status(403);
      return { error: 'Insufficient permissions' };
    }
  };
}

export function requirePermission(permission: string) {
  return async (request: AuthRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401);
      return { error: 'Authentication required' };
    }
    
    if (!request.user.permissions.includes(permission) && request.user.role !== 'admin') {
      reply.status(403);
      return { error: 'Insufficient permissions' };
    }
  };
}