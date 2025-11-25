/**
 * ESPN Data Cache Worker
 * Fetches ESPN data and caches to KV
 * Triggered via POST /refresh or cron (if available)
 */

interface Env {
  SPORTS_CACHE: KVNamespace;
}

// Comprehensive ESPN API endpoints
const ESPN_ENDPOINTS: Record<string, string> = {
  // MLB
  'mlb:scores': 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  'mlb:news': 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news',
  'mlb:teams': 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams',

  // College Baseball
  'college-baseball:scores': 'https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard',

  // NFL
  'nfl:scores': 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  'nfl:news': 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news',
  'nfl:teams': 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',

  // College Football
  'ncaa:scores': 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
  'ncaa:news': 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/news',
  'ncaa:rankings': 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings',

  // NBA
  'nba:scores': 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  'nba:news': 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news',
  'nba:teams': 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams',

  // Men's College Basketball
  'ncaa-mbb:scores': 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
  'ncaa-mbb:news': 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news',
};

// Standalone function for cache refresh
async function refreshCache(env: Env): Promise<Record<string, boolean>> {
  console.log(`ESPN Data Cache refresh at ${new Date().toISOString()}`);

  const results: Record<string, boolean> = {};

  // Fetch all endpoints in parallel
  const fetchPromises = Object.entries(ESPN_ENDPOINTS).map(async ([key, url]) => {
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${key}: ${response.status}`);
        results[key] = false;
        return;
      }

      const data = await response.json();

      // Store in KV with 10-minute TTL
      await env.SPORTS_CACHE.put(`espn:${key}`, JSON.stringify({
        data,
        fetchedAt: new Date().toISOString(),
        source: 'ESPN',
      }), {
        expirationTtl: 600,
      });

      results[key] = true;
      console.log(`Cached ${key}`);

    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      results[key] = false;
    }
  });

  await Promise.all(fetchPromises);

  // Store cache status
  await env.SPORTS_CACHE.put('espn:cache-status', JSON.stringify({
    lastRun: new Date().toISOString(),
    results,
    successCount: Object.values(results).filter(Boolean).length,
    totalCount: Object.keys(results).length,
  }), {
    expirationTtl: 3600,
  });

  console.log(`Refresh complete: ${Object.values(results).filter(Boolean).length}/${Object.keys(results).length}`);
  return results;
}

export default {
  // Scheduled cron handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await refreshCache(env);
  },

  // HTTP handler
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    };

    // Status endpoint
    if (url.pathname === '/status') {
      const status = await env.SPORTS_CACHE.get('espn:cache-status', 'json');
      return new Response(JSON.stringify(status || { error: 'No cache status' }, null, 2), {
        headers: corsHeaders,
      });
    }

    // Manual refresh endpoint
    if (url.pathname === '/refresh' && request.method === 'POST') {
      try {
        const results = await refreshCache(env);
        return new Response(JSON.stringify({ ok: true, message: 'Cache refreshed', results }, null, 2), {
          headers: corsHeaders,
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: String(error) }, null, 2), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Get specific cached data
    if (url.pathname.startsWith('/data/')) {
      const key = url.pathname.replace('/data/', '');
      const cached = await env.SPORTS_CACHE.get(`espn:${key}`, 'json');
      if (cached) {
        return new Response(JSON.stringify(cached, null, 2), {
          headers: corsHeaders,
        });
      }
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Root - show info
    return new Response(JSON.stringify({
      name: 'ESPN Data Cache Worker',
      endpoints: {
        'GET /status': 'Get cache status',
        'POST /refresh': 'Manually refresh cache',
        'GET /data/:key': 'Get cached data',
      },
      availableKeys: Object.keys(ESPN_ENDPOINTS),
    }, null, 2), {
      headers: corsHeaders,
    });
  },
};
