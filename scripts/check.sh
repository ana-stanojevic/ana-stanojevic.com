#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Site checks (same as CI)"
cd "$ROOT_DIR/site"
npm ci
npm run build
npm run test

echo "==> Intake API checks (same as CI)"
cd "$ROOT_DIR/intake-api"
poetry install --no-interaction --no-ansi
poetry run pytest -q

echo "All local checks passed (CI-equivalent)."