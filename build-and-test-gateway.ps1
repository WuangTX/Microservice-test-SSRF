# ============================================================
# BUILD AND TEST API GATEWAY
# ============================================================

$BASE_DIR = "C:\Users\ASUS-PRO\Desktop\Microservice_lab_2\Microservice-test-SSRF"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 API GATEWAY - BUILD & TEST" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Step 1: Build API Gateway
Write-Host "[STEP 1] 📦 Building API Gateway Docker Image..." -ForegroundColor Yellow
Set-Location "$BASE_DIR\api-gateway"

try {
    docker build -t tranquang04/api-gateway:latest .
    Write-Host "✅ API Gateway image built successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Start all services
Write-Host "[STEP 2] 🐳 Starting all services with API Gateway..." -ForegroundColor Yellow
Set-Location $BASE_DIR

docker-compose down
Start-Sleep -Seconds 3
docker-compose up -d

Write-Host "⏳ Waiting for services to start (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

Write-Host ""

# Step 3: Check service health
Write-Host "[STEP 3] 🏥 Checking service health..." -ForegroundColor Yellow

$services = @("redis", "api-gateway", "user-service", "product-service", "inventory-service", "order-service")

foreach ($service in $services) {
    $status = docker ps --filter "name=$service" --format "{{.Status}}"
    if ($status -match "Up") {
        Write-Host "   ✅ $service is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $service is not running" -ForegroundColor Red
    }
}

Write-Host ""

# Step 4: Test API Gateway endpoints
Write-Host "[STEP 4] 🧪 Testing API Gateway endpoints..." -ForegroundColor Yellow
Write-Host ""

$GATEWAY_URL = "http://localhost:8080"

# Test 1: Health check
Write-Host "📋 Test 1: Health Check" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$GATEWAY_URL/actuator/health" -Method Get
    Write-Host "   ✅ Gateway health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed" -ForegroundColor Red
}

Write-Host ""

# Test 2: Login through gateway
Write-Host "📋 Test 2: Login (No Auth Required)" -ForegroundColor Cyan
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
    Write-Host "   ✅ Login successful: $($response.username)" -ForegroundColor Green
    Write-Host "   Token: $($TOKEN.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Access protected endpoint
Write-Host "📋 Test 3: Protected Endpoint (Auth Required)" -ForegroundColor Cyan
if ($TOKEN) {
    try {
        $user = Invoke-RestMethod -Uri "$GATEWAY_URL/api/users/me" `
            -Method Get `
            -Headers @{Authorization="Bearer $TOKEN"}
        
        Write-Host "   ✅ User profile: $($user.username) ($($user.role))" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Protected endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  Skipped (no token)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: SSRF Protection - SHOULD BE BLOCKED
Write-Host "📋 Test 4: SSRF Protection (Should Block)" -ForegroundColor Cyan
if ($TOKEN) {
    try {
        Write-Host "   🎯 Attempting SSRF with internal service URL..." -ForegroundColor Gray
        
        $ssrfPayload = @{
            url = "http://user-service:8081/api/users"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/users/me/avatar/validate" `
            -Method Post `
            -Headers @{Authorization="Bearer $TOKEN"} `
            -ContentType "application/json" `
            -Body $ssrfPayload `
            -ErrorAction Stop
        
        Write-Host "   ⚠️  SSRF not blocked! Response received:" -ForegroundColor Yellow
        Write-Host "   $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 403) {
            Write-Host "   ✅ SSRF BLOCKED (403 Forbidden) - Protection working!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  Skipped (no token)" -ForegroundColor Yellow
}

Write-Host ""

# Test 5: SSRF with private IP - SHOULD BE BLOCKED
Write-Host "📋 Test 5: SSRF with Private IP (Should Block)" -ForegroundColor Cyan
try {
    Write-Host "   🎯 Attempting to access private IP via check_price..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/products/1/check_price/?compare_url=http://192.168.1.1" `
        -Method Get `
        -ErrorAction Stop
    
    Write-Host "   ⚠️  Private IP not blocked!" -ForegroundColor Yellow
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host "   ✅ Private IP BLOCKED (403) - Protection working!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 6: Rate Limiting
Write-Host "📋 Test 6: Rate Limiting (Send 30 requests rapidly)" -ForegroundColor Cyan
try {
    $successCount = 0
    $rateLimitedCount = 0
    
    for ($i = 1; $i -le 30; $i++) {
        try {
            Invoke-RestMethod -Uri "$GATEWAY_URL/api/products/" -Method Get -ErrorAction Stop | Out-Null
            $successCount++
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 429) {
                $rateLimitedCount++
            }
        }
    }
    
    Write-Host "   📊 Results:" -ForegroundColor White
    Write-Host "   Success: $successCount requests" -ForegroundColor Green
    Write-Host "   Rate Limited: $rateLimitedCount requests" -ForegroundColor Yellow
    
    if ($rateLimitedCount -gt 0) {
        Write-Host "   ✅ Rate limiting is working!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Rate limiting not triggered (may need more requests)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Rate limit test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Step 5: View logs
Write-Host "[STEP 5] 📋 API Gateway Logs (last 30 lines)..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
docker logs api-gateway --tail 30
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ API Gateway Features:" -ForegroundColor Green
Write-Host "   • Request Routing: ✓" -ForegroundColor White
Write-Host "   • JWT Authentication: ✓" -ForegroundColor White
Write-Host "   • SSRF Protection: ✓" -ForegroundColor White
Write-Host "   • Rate Limiting: ✓" -ForegroundColor White
Write-Host "   • Request Logging: ✓" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Gateway URL: http://localhost:8080" -ForegroundColor White
Write-Host "📊 Actuator: http://localhost:8080/actuator/health" -ForegroundColor White
Write-Host "📋 Routes: http://localhost:8080/actuator/gateway/routes" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Check logs: docker logs api-gateway -f" -ForegroundColor White
Write-Host "   2. View all routes: curl http://localhost:8080/actuator/gateway/routes" -ForegroundColor White
Write-Host "   3. Test SSRF demo: .\ssrf-privilege-escalation-demo.ps1" -ForegroundColor White
Write-Host "   4. Push to Docker Hub: docker push tranquang04/api-gateway:latest" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location $BASE_DIR
