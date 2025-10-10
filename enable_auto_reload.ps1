# Script to restart Docker services with volume mounting enabled

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ENABLE AUTO-RELOAD (VOLUME MOUNT)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n⚠️  This will restart all services!" -ForegroundColor Yellow
Write-Host "   - Volumes will be mounted" -ForegroundColor Gray
Write-Host "   - Auto-reload will be enabled" -ForegroundColor Gray
Write-Host "   - Code changes will apply instantly" -ForegroundColor Gray

$confirm = Read-Host "`nContinue? (y/n)"

if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit
}

Write-Host "`n[Step 1] Stopping all services..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stop services!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[Step 2] Starting services with volumes..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[Step 3] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "`n[Step 4] Verifying volume mounts..." -ForegroundColor Yellow

# Check product-service
Write-Host "`n   Checking product-service..." -ForegroundColor Gray
docker-compose exec -T product-service ls -la /app/products/admin.py | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ product-service volume mounted" -ForegroundColor Green
} else {
    Write-Host "   ❌ product-service volume NOT mounted!" -ForegroundColor Red
}

# Check inventory-service
Write-Host "   Checking inventory-service..." -ForegroundColor Gray
docker-compose exec -T inventory-service ls -la /app/app.py | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ inventory-service volume mounted" -ForegroundColor Green
} else {
    Write-Host "   ❌ inventory-service volume NOT mounted!" -ForegroundColor Red
}

# Check frontend
Write-Host "   Checking frontend..." -ForegroundColor Gray
docker-compose exec -T frontend ls -la /app/src/App.js | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ frontend volume mounted" -ForegroundColor Green
} else {
    Write-Host "   ❌ frontend volume NOT mounted!" -ForegroundColor Red
}

Write-Host "`n[Step 5] Checking auto-reload status..." -ForegroundColor Yellow

# Check Django auto-reload
$djangoLogs = docker-compose logs --tail=50 product-service | Select-String -Pattern "StatReloader|Watching"
if ($djangoLogs) {
    Write-Host "   ✅ Django auto-reload: ENABLED" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Django auto-reload: Not detected" -ForegroundColor Yellow
}

# Check Flask debug mode
$flaskLogs = docker-compose logs --tail=50 inventory-service | Select-String -Pattern "DEBUG|Debugger"
if ($flaskLogs) {
    Write-Host "   ✅ Flask debug mode: ENABLED" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Flask debug mode: Not detected" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  AUTO-RELOAD SETUP COMPLETED!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n📝 How to test auto-reload:" -ForegroundColor White
Write-Host "   1. Edit any .py file in VS Code" -ForegroundColor Gray
Write-Host "   2. Save (Ctrl+S)" -ForegroundColor Gray
Write-Host "   3. Watch logs: docker-compose logs -f product-service" -ForegroundColor Gray
Write-Host "   4. You should see: 'file changed, reloading.'" -ForegroundColor Gray
Write-Host "   5. Refresh browser to see changes!" -ForegroundColor Gray

Write-Host "`n🌐 Services:" -ForegroundColor White
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   User:      http://localhost:8081" -ForegroundColor Cyan
Write-Host "   Product:   http://localhost:8082" -ForegroundColor Cyan
Write-Host "   Inventory: http://localhost:8083" -ForegroundColor Cyan

Write-Host "`n📖 Read more: DOCKER_AUTO_RELOAD.md" -ForegroundColor Yellow
