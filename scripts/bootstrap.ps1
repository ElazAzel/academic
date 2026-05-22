$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is required for local bootstrap. Install Docker Desktop or another Docker-compatible runtime first."
}

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
}

docker compose up -d postgres redis mailhog minio
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose run --rm app npm run db:generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose run --rm app npm run db:push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker compose run --rm app npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "AI Strategic Academy local bootstrap complete."
