#!/usr/bin/env bash
set -euo pipefail

# Periodic ingestion + dedupe + stale marking
# Usage: ./scripts/literature_sync.sh [since]
SINCE="${1:-7d}"

cd "$(dirname "$0")/.."

python -m src.ingest --incremental --since "$SINCE" --delay 0.5
python -m src.ingest dedupe-studies
python -m src.ingest mark-stale --stale-days "${COMPOUND_STALE_DAYS:-45}"

echo "Literature sync complete (window=$SINCE)."