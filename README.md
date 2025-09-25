# Blaze Sports Intel — Minimal Bootable Stack
Last updated: 2025-09-25 (America/Chicago)

Mission: Bridge instinct and data into runnable systems that prove value on first boot—Texas-rooted, Deep South aware, rigor first, artifacts always.

## Overview
- Frontend: Vite + React SPA (apps/web)
- Hosting: Netlify (prod + previews)
- CDN/Assets: Cloudflare R2 via S3-compatible API (script provided)
- Tooling: pnpm workspaces, ESLint/Prettier, Vitest, OpenTelemetry-ready logging hook
- Security: .env.example (no secrets), secret rotation guide, CSP and redirects

## Quickstart
1) Prereqs: Node 20+, pnpm 9+
2) Install:
   pnpm install
3) Dev:
   ./scripts/dev.sh
   # or: pnpm --filter @blaze/web dev
4) Build:
   pnpm build
5) Preview build:
   pnpm --filter @blaze/web preview
6) Docker (local static serve):
   docker compose up -d --build

## One-command local boot
make dev
# or
./scripts/dev.sh

## Environment
Copy .env.example to .env in project root or export as shell env vars. Do NOT commit .env.

## Seeds
sample_data/ includes ordered examples:
- baseball_sample.json
- football_sample.json
- basketball_sample.json
- track_sample.json

Load path example:
import baseball from '../../sample_data/baseball_sample.json';

## Scripts
- pnpm build: build all packages
- pnpm test: run tests
- pnpm lint / pnpm format
- pnpm --filter @blaze/web dev/preview/build
- node scripts/verify_env.mjs
- node scripts/r2_upload.mjs ./dist assets/web/

## CI/CD
- ci.yml: lint + test on PRs and pushes
- deploy.yml: build and deploy to Netlify. Publish dir fixed to apps/web/dist. PR previews enabled.

## Netlify redirects and headers
- netlify.toml sets:
  - *.html -> extensionless 301
  - SPA fallback
  - Strict CSP, HSTS, cache headers

## Telemetry
- Minimal OTEL/logging hook wired in src/components/Telemetry.ts. Extend with OTLP exporter when backend is ready.

## Security
- Secrets were detected as public in prior context. Rotate immediately. See docs/SECURITY_ROTATION.md.
- .env is gitignored. Use .env.example for placeholders.
- CI and repo contain no secrets.

## Performance
- Expected scale: static SPA + cached assets at edge; R2 objects long-lived with versioning.
- Bottlenecks: large 3D assets; mitigate with R2 and aggressive cache-control.
- Profiling path: Lighthouse CI or Web Vitals; measure FCP/LCP/CLS; lazy-load 3D.

## Troubleshooting
- Build dir wrong? Ensure deploy uses apps/web/dist
- 404 on deep-links? SPA fallback configured in netlify.toml and public/_redirects
- R2 upload fails? Check endpoint/region and credentials; see docs.

## License
MIT
