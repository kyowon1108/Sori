#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p contracts

PYTHONPATH=backend \
DATABASE_URL="sqlite:///:memory:" \
SECRET_KEY="local-dev-secret" \
python3 - <<'PY'
import json
from app.main import app

schema = app.openapi()
with open("contracts/openapi.snapshot.json", "w") as f:
    json.dump(schema, f, indent=2, sort_keys=True)
PY

echo "Wrote contracts/openapi.snapshot.json"
