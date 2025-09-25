export interface Env {
  UE_FRONTEND_URL: string;
  ALLOWED_ADMIN_EMAIL?: string;
  BSI_FLAGS: KVNamespace;
  BSI_ASSETS: R2Bucket;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function csp(headers: Headers) {
  headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  headers.delete('X-Frame-Options');
}

function isAccess(request: Request) {
  return request.headers.has('Cf-Access-Jwt-Assertion');
}

async function handleFlags(req: Request, env: Env): Promise<Response> {
  if (req.method === 'GET') {
    const list = await env.BSI_FLAGS.list();
    const payload: Record<string, string> = {};
    for (const key of list.keys) {
      payload[key.name] = (await env.BSI_FLAGS.get(key.name)) ?? '';
    }
    const res = new Response(JSON.stringify({ flags: payload }), { headers: JSON_HEADERS });
    csp(res.headers);
    return res;
  }

  if (req.method === 'POST') {
    if (!isAccess(req)) return new Response('unauthorized', { status: 401 });
    if (env.ALLOWED_ADMIN_EMAIL) {
      const email = req.headers.get('Cf-Access-Authenticated-User-Email') || '';
      if (email.toLowerCase() !== env.ALLOWED_ADMIN_EMAIL.toLowerCase()) {
        return new Response('forbidden', { status: 403 });
      }
    }
    const body = await req.json<{ updates: Record<string, string> }>().catch(() => null);
    if (!body || !body.updates) return new Response('bad request', { status: 400 });
    await Promise.all(Object.entries(body.updates).map(([key, value]) => env.BSI_FLAGS.put(key, String(value))));
    const res = new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
    csp(res.headers);
    return res;
  }

  return new Response('method not allowed', { status: 405 });
}

async function handleAssets(req: Request, env: Env): Promise<Response> {
  const key = new URL(req.url).pathname.replace(/^\/dev\/assets\//, '');
  if (!key) return new Response('not found', { status: 404 });

  const obj = await env.BSI_ASSETS.get(key);
  if (!obj) return new Response('not found', { status: 404 });

  const headers = new Headers();
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('access-control-allow-origin', '*');
  const ext = key.split('.').pop()?.toLowerCase();
  const type = ext === 'gltf' ? 'model/gltf+json'
    : ext === 'glb' ? 'model/gltf-binary'
    : ext === 'ktx2' ? 'image/ktx2'
    : ext === 'drc' ? 'application/octet-stream'
    : 'application/octet-stream';
  headers.set('content-type', type);

  const res = new Response(obj.body, { headers });
  csp(res.headers);
  return res;
}

async function handleUE(req: Request, env: Env): Promise<Response> {
  const upstream = new URL(env.UE_FRONTEND_URL);
  const incoming = new URL(req.url);
  const path = incoming.pathname.replace(/^\/dev\/ue/, '/');
  const outUrl = new URL(upstream.origin + path + (incoming.search || ''));

  const headers = new Headers(req.headers);
  headers.set('Host', upstream.host);
  headers.set('X-Forwarded-Host', incoming.host);
  headers.set('X-Forwarded-Proto', 'https');

  const resp = await fetch(outUrl.toString(), {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
    redirect: 'manual',
  });

  const newHeaders = new Headers(resp.headers);
  csp(newHeaders);
  return new Response(resp.body, { status: resp.status, headers: newHeaders });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/dev/flags')) return handleFlags(req, env);
    if (pathname.startsWith('/dev/assets/')) return handleAssets(req, env);
    if (pathname.startsWith('/dev/ue')) return handleUE(req, env);
    return new Response('not found', { status: 404 });
  },
};
