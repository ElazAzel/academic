# Validate prisma/schema.prisma after the duplicate-schema repair commits.
# This script intentionally avoids hard-coded line replacement: the schema has
# moved since the original repair and line-based rewriting can corrupt it.

$ErrorActionPreference = "Stop"

$schemaPath = Resolve-Path (Join-Path $PSScriptRoot "..\prisma\schema.prisma")
$content = Get-Content -LiteralPath $schemaPath -Raw

$generatorCount = ([regex]::Matches($content, "(?m)^generator\s+client\s*\{")).Count
$datasourceCount = ([regex]::Matches($content, "(?m)^datasource\s+db\s*\{")).Count

if ($generatorCount -ne 1 -or $datasourceCount -ne 1) {
  throw "Unexpected Prisma schema layout: generator blocks=$generatorCount, datasource blocks=$datasourceCount. Refusing to rewrite schema automatically."
}

& npx prisma validate
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Prisma schema layout is safe and validates successfully."
