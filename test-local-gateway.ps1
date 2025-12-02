# ============================================================
# TEST LOCAL API GATEWAY (NGINX)
# Run this after: docker-compose up -d
# ============================================================

$GATEWAY_URL = "http://localhost"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🌐 TESTING LOCAL API GATEWAY (NGINX)" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Wait for services to start
Write-Host "⏳ Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test 1: Frontend
Write-Host "`n[TEST 1] 🏠 Testing Frontend through Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$GATEWAY_URL/" -Method Get -TimeoutSec 5
    Write-Host "✅ Frontend accessible: HTTP $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: User Service - Login
Write-Host "`n[TEST 2] 🔐 Testing User Service - Login..." -ForegroundColor Yellow
try {
    $loginData = @{
        username = "user1"
        password = "user123"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData
    
    $TOKEN = $response.token
    Write-Host "✅ Login successful: $($response.username) ($($response.role))" -ForegroundColor Green
    Write-Host "   Token: $($TOKEN.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Product Service
Write-Host "`n[TEST 3] 🛍️ Testing Product Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/products/" -Method Get
    Write-Host "✅ Products accessible: $($response.Count) products found" -ForegroundColor Green
} catch {
    Write-Host "❌ Products failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Inventory Service
Write-Host "`n[TEST 4] 📦 Testing Inventory Service..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/inventory/1" -Method Get
    Write-Host "✅ Inventory accessible: Product $($response.product_id) has $($response.sizes.M) units" -ForegroundColor Green
} catch {
    Write-Host "❌ Inventory failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Order Service (requires auth)
Write-Host "`n[TEST 5] 📋 Testing Order Service..." -ForegroundColor Yellow
try {
    if ($TOKEN) {
        $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/orders/" `
            -Method Get `
            -Headers @{Authorization="Bearer $TOKEN"}
        Write-Host "✅ Orders accessible: $($response.Count) orders found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipped (no token)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Orders failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: SSRF Endpoint (through gateway)
Write-Host "`n[TEST 6] 🎯 Testing SSRF Endpoint through Gateway..." -ForegroundColor Yellow
try {
    if ($TOKEN) {
        $ssrfPayload = @{
            url = "http://product-service:8082/api/products/"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/users/me/avatar/validate" `
            -Method Post `
            -Headers @{Authorization="Bearer $TOKEN"} `
            -ContentType "application/json" `
            -Body $ssrfPayload
        
        Write-Host "✅ SSRF endpoint accessible through gateway" -ForegroundColor Green
        Write-Host "   Target: $($response.url)" -ForegroundColor Gray
        Write-Host "   HTTP Code: $($response.validation.httpCode)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Skipped (no token)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ SSRF test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📊 GATEWAY TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Gateway URL: $GATEWAY_URL" -ForegroundColor White
Write-Host "All services are routed through NGINX API Gateway" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check nginx logs: docker logs nginx-gateway" -ForegroundColor White
Write-Host "2. View all containers: docker ps" -ForegroundColor White
Write-Host "3. Test SSRF attacks: .\ssrf-privilege-escalation-demo.ps1" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
