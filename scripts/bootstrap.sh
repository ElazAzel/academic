#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install
npm run db:generate
npm run db:push
npm run db:seed

echo "AI Strategic Academy bootstrap complete."

