# Script to create Django superuser for product-service admin panel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DJANGO ADMIN SETUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1] Creating superuser..." -ForegroundColor Yellow

# Run create_superuser.py inside container
docker-compose exec -T product-service python create_superuser.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Setup completed successfully!" -ForegroundColor Green
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  ACCESS DJANGO ADMIN" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`n🌐 URL:      " -NoNewline -ForegroundColor White
    Write-Host "http://localhost:8082/admin/" -ForegroundColor Green
    
    Write-Host "👤 Username: " -NoNewline -ForegroundColor White
    Write-Host "admin" -ForegroundColor Green
    
    Write-Host "🔑 Password: " -NoNewline -ForegroundColor White
    Write-Host "admin123" -ForegroundColor Green
    
    Write-Host "`n📝 Features:" -ForegroundColor White
    Write-Host "   - View all products" -ForegroundColor Gray
    Write-Host "   - Add/Edit/Delete products" -ForegroundColor Gray
    Write-Host "   - Manage product sizes" -ForegroundColor Gray
    Write-Host "   - Search products" -ForegroundColor Gray
    
    Write-Host "`n🚀 Opening admin panel..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8082/admin/"
    
} else {
    Write-Host "`n❌ Failed to create superuser!" -ForegroundColor Red
    Write-Host "   Make sure product-service container is running" -ForegroundColor Yellow
    Write-Host "   Run: docker-compose up -d" -ForegroundColor Yellow
}
