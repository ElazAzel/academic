#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for local bootstrap. Install a Docker-compatible runtime first." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

docker compose up -d postgres redis mailhog minio
docker compose run --rm app npm run db:generate
docker compose run --rm app npm run db:push
docker compose run --rm app npm run db:seed

echo "AI Strategic Academy local bootstrap complete."
