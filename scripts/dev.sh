#!/usr/bin/env bash
set -euo pipefail
pnpm install
pnpm --filter @blaze/web dev
