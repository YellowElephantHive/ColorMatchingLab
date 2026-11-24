#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"
run_dir="artifacts/run-$(date -u +%Y%m%dT%H%M%SZ)"
uv sync --frozen --extra dev --no-editable --reinstall-package color-matching-lab
uv run --no-sync pytest -q
uv run --no-sync colorlab train --out "$run_dir"
uv run --no-sync colorlab export --run "$run_dir" --out reports/ColorMatchingLab.html
printf 'Completed run: %s\n' "$run_dir"
