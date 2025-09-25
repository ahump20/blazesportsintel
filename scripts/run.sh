#!/usr/bin/env bash
set -euo pipefail
pnpm install
pnpm build
pnpm --filter @blaze/web preview
