# start-db.ps1 — Запускает локальный PostgreSQL для разработки
# Вызывается автоматически из npm run dev (см. package.json scripts)

$pgDir = "C:\Temp\opencode\pgsql\pgsql"
$pgBin = "$pgDir\bin"
$pgData = "C:\Temp\opencode\pgdata"

# Check if PostgreSQL is already running
$running = & "$pgBin\pg_ctl.exe" status -D $pgData 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Output "[start-db] PostgreSQL already running"
    exit 0
}

# Check if initialized
if (-not (Test-Path "$pgData\PG_VERSION")) {
    Write-Output "[start-db] Initializing database cluster..."
    & "$pgBin\initdb.exe" -D $pgData --username=academy --auth=trust --encoding=UTF8 2>&1
}

# Start PostgreSQL
Write-Output "[start-db] Starting PostgreSQL..."
$log = "C:\Temp\opencode\pg.log"
& "$pgBin\pg_ctl.exe" start -D $pgData -l $log -o "-p 5432 -c listen_addresses=localhost" 2>&1

Start-Sleep -Seconds 3

# Check if started
$running = & "$pgBin\pg_ctl.exe" status -D $pgData 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Output "[start-db] PostgreSQL started on port 5432"
    
    # Ensure academy database exists
    & "$pgBin\psql.exe" -U academy -h 127.0.0.1 -d postgres -c "SELECT 1 FROM pg_database WHERE datname='academy'" 2>$null | Select-String "1 row" >$null
    if ($LASTEXITCODE -ne 0) {
        Write-Output "[start-db] Creating academy database..."
        & "$pgBin\psql.exe" -U academy -h 127.0.0.1 -d postgres -c "CREATE DATABASE academy;" 2>&1
    }
} else {
    Write-Output "[start-db] WARNING: PostgreSQL failed to start"
    Write-Output "[start-db] Check log: $log"
}
