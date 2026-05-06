if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
}

npm.cmd install
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed

Write-Host "AI Strategic Academy bootstrap complete."

