#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "${script_dir}/.." && pwd)"
compose_file="${repository_root}/docker-compose.test.yml"
compose_project="${TCG_E2E_PROJECT_NAME:-tcg-nexus-e2e}"
database_port="${E2E_DATABASE_PORT:-55432}"

cleanup() {
  docker compose \
    --project-name "${compose_project}" \
    --file "${compose_file}" \
    down --volumes --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

docker compose \
  --project-name "${compose_project}" \
  --file "${compose_file}" \
  up --detach --wait postgres

export NODE_ENV=test
export DATABASE_HOST=127.0.0.1
export DATABASE_PORT="${database_port}"
export DATABASE_USER=postgres
export DATABASE_PASSWORD=postgres
export DATABASE_NAME=tcg_nexus_test
export DATABASE_SYNCHRONIZE=true
export DATABASE_SSL=false
export JWT_SECRET="tcg-nexus-e2e-access-secret"
export JWT_REFRESH_SECRET="tcg-nexus-e2e-refresh-secret"
export EXTERNAL_TOURNAMENT_API_URL=""

cd "${repository_root}/apps/api"
npx jest --config ./test/jest-e2e.json --runInBand "$@"
