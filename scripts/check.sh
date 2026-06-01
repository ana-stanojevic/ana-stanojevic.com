#!/usr/bin/env bash
set -euo pipefail

echo "Checking frontend..."
cd site
npm run build

echo "Checking backend..."
cd ../intake-api
poetry install --no-interaction --no-ansi
poetry run python -c "from main import app; assert app.title"

poetry run python - <<'PY'
from fastapi.testclient import TestClient
from main import app

response = TestClient(app).get("/health")
assert response.status_code == 200
assert response.json() == {"ok": True}
PY

echo "All checks passed."