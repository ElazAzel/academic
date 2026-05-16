# Generate VAPID keys for Web Push notifications
# Run: node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log(JSON.stringify(keys, null, 2));"

Write-Host "=== Generating VAPID keys for Web Push ===" -ForegroundColor Cyan
Write-Host ""

$result = node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY=' + keys.publicKey); console.log('VAPID_PRIVATE_KEY=' + keys.privateKey); console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey);"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: web-push package not found. Run: npm install web-push" -ForegroundColor Red
    exit 1
}

Write-Host $result
Write-Host ""
Write-Host "=== Add these to your .env and Vercel environment variables ===" -ForegroundColor Yellow
Write-Host "Also set: FEATURE_PUSH_NOTIFICATIONS=true" -ForegroundColor Yellow
Write-Host "Also set: VAPID_EMAIL=your-email@example.com" -ForegroundColor Yellow
