#!/usr/bin/env sh
set -eu
npm run lint
npm run typecheck
npm run test
npm run build

