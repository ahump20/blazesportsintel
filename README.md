# Blaze Sports Intel — Developer Mode Graphics Stack
Last updated: 2025-09-25 (America/Chicago)

## Overview
- Frontend: Next.js 14 app (apps/web) with /dev Developer Mode UI and WebGPU labs
- Edge: Cloudflare Worker proxy for UE Pixel Streaming, KV feature flags, and R2 asset serving
- Hosting: Netlify for Next.js build; Cloudflare Access gates `/dev/*`
- Assets: Cloudflare R2 bucket (`bsi-3d-assets`) for `.gltf/.glb/.ktx2/.drc`
- Observability: OpenTelemetry web tracer stub (configurable via `/otel` or OTLP collector)

Sports focus order is always **Baseball → Football → Basketball → Track & Field**. Soccer is intentionally excluded.

## Quickstart
1. Requirements: Node 20+, npm 10+, Wrangler CLI for Worker deployments.
2. Install workspaces:
   ```bash
   npm install
   ```
3. Run the web app locally (Next dev server on :5173):
   ```bash
   npm run dev:web
   ```
4. Build artifacts:
   ```bash
   npm run build:web
   ```
5. Deploy the Cloudflare Worker:
   ```bash
   npm run deploy:worker
   ```

## Developer Mode
- `/dev` home surfaces KV feature flags (engine mode, codec, bitrate, resolution).
- `/dev/ue` reverse-proxies the Unreal Pixel Streaming frontend through Cloudflare Worker.
- `/dev/labs` hosts WebGPU experiments, including a Baseball strike zone 3D demo with WebGL fallback.
- `/dev/assets/*` streams R2-hosted 3D assets with immutable caching and CORS enabled.

## Cloudflare Configuration Checklist
1. Protect `blazesportsintel.com/dev/*` with Cloudflare Access (Zero-Trust) — allow engineering emails only.
2. Create KV namespace for feature flags and set `YOUR_KV_NAMESPACE_ID` in `wrangler.toml`.
3. Provision R2 bucket `bsi-3d-assets`; upload assets and wire to the Worker route.
4. Set Worker environment variables (`UE_FRONTEND_URL`, `ALLOWED_ADMIN_EMAIL`).
5. Deploy Worker (`infra/cloudflare/workers/dev-ue-proxy`).

## Netlify Deployment
- Netlify build command: `npm run build --workspace apps/web`
- Publish directory: `apps/web/.next`
- Headers for `/dev/*` enforce `frame-ancestors 'self'` and restricted permissions.

## OpenTelemetry
- `apps/web/app/instrumentation.ts` registers a minimal OTLP trace exporter.
- Configure runtime by setting `window.__OTLP_URL` before hydration or proxy `/otel` to your collector.

## Pixel Streaming Reference
- `infra/pixel-streaming/docker-compose.yml` scaffolds Epic Games signaling, matchmaker, and SFU containers.
- Deploy on a GPU-capable host, expose HTTPS via Cloudflare, and update `UE_FRONTEND_URL` for the Worker proxy.

## Scripts & Utilities
- `scripts/r2_upload.mjs`: Upload build assets to R2 (after configuring env vars).
- `scripts/verify_env.mjs`: Minimal env validation helper.

## Security
- Never commit `.env`; secrets belong in Cloudflare/Netlify config.
- Rotate any exposed credentials immediately (see `docs/SECURITY_ROTATION.md`).

## License
MIT
