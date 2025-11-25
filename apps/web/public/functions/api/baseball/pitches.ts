/**
 * Cloudflare Pages Function: MLB Pitch Data API
 * Provides cached MLB pitch data for the 3D Pitch Tunnel Simulator
 *
 * Endpoint: /api/baseball/pitches
 * Methods: GET
 * Caching: KV with 5-minute TTL for live games, 1-hour for completed games
 *
 * Performance Requirements:
 * - Response time: <100ms (p95)
 * - Cache hit rate: >90%
 * - Bundle size: <50KB
 */

import type { PagesFunction, EventContext } from '@cloudflare/workers-types';

// ====================
// TYPES
// ====================

interface Env {
  SPORTS_DATA: KVNamespace;
  BSI_DB: D1Database;
  SPORTSDATAIO_API_KEY: string;
}

interface MLBPitchResponse {
  pitches: Array<{
    pitchId: string;
    pitcherName: string;
    pitchType: string;
    velocity: number;
    spinRate: number;
    releasePoint: { x: number; y: number; z: number };
    plateLocation: { x: number; y: number };
    breakAmount: { x: number; y: number };
    timestamp: number;
  }>;
  cached: boolean;
  cacheAge: number;
  dataSource: string;
  nextUpdate: number;
}

interface CacheMetadata {
  timestamp: number;
  ttl: number;
  gameId: string;
  gameStatus: 'live' | 'final' | 'scheduled';
}

// ====================
// CONSTANTS
// ====================

const CACHE_TTL = {
  LIVE_GAME: 300, // 5 minutes for live games
  FINAL_GAME: 3600, // 1 hour for completed games
  SCHEDULED: 86400, // 24 hours for future games
};

const API_CONFIG = {
  SPORTSDATAIO_BASE: 'https://api.sportsdata.io/v3/mlb/scores/json',
  RATE_LIMIT_PER_MINUTE: 60,
  TIMEOUT_MS: 5000,
};

// ====================
// MAIN HANDLER
// ====================

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Parse query parameters
  const gameId = url.searchParams.get('gameId');
  const pitcherId = url.searchParams.get('pitcherId');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const useCache = url.searchParams.get('cache') !== 'false';

  try {
    // Validate parameters
    if (!gameId && !pitcherId) {
      return jsonResponse(
        { error: 'Missing required parameter: gameId or pitcherId' },
        400
      );
    }

    // Check cache first
    if (useCache) {
      const cached = await getCachedPitches(env.SPORTS_DATA, gameId, pitcherId);
      if (cached) {
        return jsonResponse(cached, 200, {
          'Cache-Control': 'public, max-age=60, s-maxage=300',
          'X-Cache': 'HIT',
          'X-Cache-Age': String(cached.cacheAge),
        });
      }
    }

    // Fetch fresh data from SportsDataIO
    const pitches = await fetchMLBPitches(env, gameId, pitcherId, limit);

    // Cache the response
    await cachePitches(env.SPORTS_DATA, gameId, pitcherId, pitches);

    // Log to D1 for analytics
    await logAPIRequest(env.BSI_DB, {
      endpoint: '/api/baseball/pitches',
      gameId,
      pitcherId,
      timestamp: Date.now(),
      cached: false,
    });

    return jsonResponse(pitches, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Cache': 'MISS',
    });

  } catch (error) {
    console.error('Error fetching MLB pitch data:', error);

    return jsonResponse(
      {
        error: 'Failed to fetch pitch data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
};

// ====================
// CACHE FUNCTIONS
// ====================

/**
 * Get cached pitches from KV storage
 */
async function getCachedPitches(
  kv: KVNamespace,
  gameId: string | null,
  pitcherId: string | null
): Promise<MLBPitchResponse | null> {
  const cacheKey = buildCacheKey(gameId, pitcherId);

  try {
    const cached = await kv.get<MLBPitchResponse>(cacheKey, 'json');
    if (!cached) return null;

    // Check if cache is still valid
    const metadata = await kv.get<CacheMetadata>(`${cacheKey}:meta`, 'json');
    if (!metadata) return null;

    const age = Date.now() - metadata.timestamp;
    const maxAge = CACHE_TTL[metadata.gameStatus];

    if (age > maxAge * 1000) {
      // Cache expired
      await kv.delete(cacheKey);
      await kv.delete(`${cacheKey}:meta`);
      return null;
    }

    return {
      ...cached,
      cached: true,
      cacheAge: Math.floor(age / 1000),
      nextUpdate: metadata.timestamp + maxAge * 1000,
    };

  } catch (error) {
    console.error('KV cache read error:', error);
    return null;
  }
}

/**
 * Cache pitches to KV storage
 */
async function cachePitches(
  kv: KVNamespace,
  gameId: string | null,
  pitcherId: string | null,
  data: MLBPitchResponse
): Promise<void> {
  const cacheKey = buildCacheKey(gameId, pitcherId);

  // Determine game status and TTL
  const gameStatus = data.dataSource.includes('live') ? 'live' : 'final';
  const ttl = CACHE_TTL[gameStatus];

  const metadata: CacheMetadata = {
    timestamp: Date.now(),
    ttl,
    gameId: gameId || 'unknown',
    gameStatus,
  };

  try {
    await Promise.all([
      kv.put(cacheKey, JSON.stringify(data), { expirationTtl: ttl }),
      kv.put(`${cacheKey}:meta`, JSON.stringify(metadata), { expirationTtl: ttl }),
    ]);
  } catch (error) {
    console.error('KV cache write error:', error);
  }
}

/**
 * Build cache key from parameters
 */
function buildCacheKey(gameId: string | null, pitcherId: string | null): string {
  if (gameId) return `mlb:pitches:game:${gameId}`;
  if (pitcherId) return `mlb:pitches:pitcher:${pitcherId}`;
  return `mlb:pitches:latest`;
}

// ====================
// DATA FETCHING
// ====================

/**
 * Fetch MLB pitch data from SportsDataIO API
 */
async function fetchMLBPitches(
  env: Env,
  gameId: string | null,
  pitcherId: string | null,
  limit: number
): Promise<MLBPitchResponse> {
  const apiKey = env.SPORTSDATAIO_API_KEY;

  if (!apiKey) {
    throw new Error('SPORTSDATAIO_API_KEY not configured');
  }

  // Build API URL
  let apiUrl: string;
  if (gameId) {
    apiUrl = `${API_CONFIG.SPORTSDATAIO_BASE}/PlayByPlay/${gameId}?key=${apiKey}`;
  } else if (pitcherId) {
    apiUrl = `${API_CONFIG.SPORTSDATAIO_BASE}/PitchersByActive?key=${apiKey}`;
  } else {
    throw new Error('Invalid parameters');
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BlazeSportsIntel/2.0',
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`SportsDataIO API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Transform to our format
    const pitches = transformSportsDataIO(rawData, limit);

    return {
      pitches,
      cached: false,
      cacheAge: 0,
      dataSource: 'SportsDataIO MLB API',
      nextUpdate: Date.now() + CACHE_TTL.LIVE_GAME * 1000,
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('API request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transform SportsDataIO response to our pitch format
 */
function transformSportsDataIO(rawData: any, limit: number): MLBPitchResponse['pitches'] {
  // SportsDataIO returns play-by-play data with pitch details
  const plays = rawData.Plays || [];
  const pitches: MLBPitchResponse['pitches'] = [];

  for (const play of plays) {
    if (!play.Pitches || play.Pitches.length === 0) continue;

    for (const pitch of play.Pitches) {
      if (pitches.length >= limit) break;

      pitches.push({
        pitchId: `${play.PlayID}_${pitch.PitchNumberThisAtBat}`,
        pitcherName: play.PitcherName || 'Unknown',
        pitchType: mapPitchType(pitch.Type),
        velocity: pitch.Velocity || 0,
        spinRate: pitch.SpinRate || 0,
        releasePoint: {
          x: pitch.ReleaseX || 0,
          y: pitch.ReleaseY || 6.0, // Default to 6 feet
          z: pitch.ReleaseZ || 60.5, // Mound distance
        },
        plateLocation: {
          x: pitch.PlateX || 0,
          y: pitch.PlateZ || 2.5, // Default to middle of strike zone
        },
        breakAmount: {
          x: pitch.BreakX || 0,
          y: pitch.BreakY || 0,
        },
        timestamp: play.Updated ? new Date(play.Updated).getTime() : Date.now(),
      });
    }

    if (pitches.length >= limit) break;
  }

  return pitches;
}

/**
 * Map SportsDataIO pitch type codes to our format
 */
function mapPitchType(code: string): string {
  const typeMap: Record<string, string> = {
    'FF': 'fastball',
    'FT': 'fastball', // Two-seam fastball
    'FC': 'cutter',
    'SI': 'sinker',
    'SL': 'slider',
    'CU': 'curveball',
    'CH': 'changeup',
    'FS': 'changeup', // Splitter
    'KC': 'curveball', // Knuckle curve
  };

  return typeMap[code] || 'fastball';
}

// ====================
// ANALYTICS
// ====================

/**
 * Log API request to D1 for analytics
 */
async function logAPIRequest(
  db: D1Database,
  log: {
    endpoint: string;
    gameId: string | null;
    pitcherId: string | null;
    timestamp: number;
    cached: boolean;
  }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO api_logs (endpoint, game_id, pitcher_id, timestamp, cached)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        log.endpoint,
        log.gameId,
        log.pitcherId,
        log.timestamp,
        log.cached ? 1 : 0
      )
      .run();
  } catch (error) {
    console.error('Failed to log API request:', error);
  }
}

// ====================
// UTILITIES
// ====================

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: any, status: number, additionalHeaders?: Record<string, string>): Response {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://blazesportsintel.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    ...additionalHeaders,
  };

  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * OPTIONS handler for CORS preflight
 */
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://blazesportsintel.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
};
