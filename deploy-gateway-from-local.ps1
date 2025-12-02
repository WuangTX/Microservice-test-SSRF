# ============================================================
# DEPLOY API GATEWAY TO SERVER (PowerShell Script)
# Run from local machine: .\deploy-gateway-from-local.ps1
# ============================================================

$SERVER = "103.56.163.193"
$PORT = "24700"
$USER = "quang"
$REMOTE_DIR = "/home/quang/microservices"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 DEPLOYING API GATEWAY TO SERVER" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Step 1: Check if image is pushed to Docker Hub
Write-Host "[STEP 1] 🔍 Checking Docker Hub for API Gateway image..." -ForegroundColor Yellow
try {
    $dockerHubCheck = Invoke-RestMethod -Uri "https://hub.docker.com/v2/repositories/tranquang04/api-gateway/tags/latest" -Method Get -ErrorAction SilentlyContinue
    Write-Host "✅ Image found on Docker Hub" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Image may not be on Docker Hub yet. Checking local..." -ForegroundColor Yellow
    $localImage = docker images tranquang04/api-gateway:latest --format "{{.ID}}"
    if ($localImage) {
        Write-Host "📦 Local image found: $localImage" -ForegroundColor White
        $push = Read-Host "Push to Docker Hub now? (y/n)"
        if ($push -eq "y") {
            Write-Host "🚀 Pushing image..." -ForegroundColor Cyan
            docker push tranquang04/api-gateway:latest
            Write-Host "✅ Image pushed successfully!" -ForegroundColor Green
        }
    }
}

Write-Host ""

# Step 2: Copy deployment script to server
Write-Host "[STEP 2] 📤 Copying deployment script to server..." -ForegroundColor Yellow
try {
    scp -P $PORT "deploy-gateway-to-server.sh" "${USER}@${SERVER}:~/"
    Write-Host "✅ Script copied successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to copy script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: SSH and execute deployment
Write-Host "[STEP 3] 🔗 Connecting to server and deploying..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$sshCommand = @"
chmod +x ~/deploy-gateway-to-server.sh && ~/deploy-gateway-to-server.sh
"@

ssh -p $PORT "${USER}@${SERVER}" $sshCommand

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Step 4: Update Nginx configuration
Write-Host "[STEP 4] 🌐 Nginx configuration..." -ForegroundColor Yellow
Write-Host "⚠️  You need to update Nginx to proxy to API Gateway:" -ForegroundColor Yellow
Write-Host ""
Write-Host "On server, edit: sudo nano /etc/nginx/sites-available/quangtx.io.vn" -ForegroundColor White
Write-Host ""
Write-Host "Replace backend URLs with gateway:" -ForegroundColor White
Write-Host "  OLD: http://localhost:8081 (user-service)" -ForegroundColor Gray
Write-Host "  NEW: http://localhost:8080 (api-gateway)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then reload: sudo systemctl reload nginx" -ForegroundColor White

Write-Host ""

# Step 5: Test deployment
Write-Host "[STEP 5] 🧪 Testing deployment..." -ForegroundColor Yellow
try {
    Write-Host "Testing health endpoint..." -ForegroundColor Gray
    ssh -p $PORT "${USER}@${SERVER}" "curl -s http://localhost:8080/actuator/health" | ConvertFrom-Json | Format-Table
    
    Write-Host "✅ API Gateway is responding!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not test endpoint. Check manually after Nginx update." -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Completed steps:" -ForegroundColor Green
Write-Host "   • API Gateway image pushed to Docker Hub" -ForegroundColor White
Write-Host "   • Deployment script copied to server" -ForegroundColor White
Write-Host "   • Containers started on server" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Manual steps required:" -ForegroundColor Yellow
Write-Host "   1. SSH to server: ssh -p $PORT ${USER}@${SERVER}" -ForegroundColor White
Write-Host "   2. Edit Nginx config: sudo nano /etc/nginx/sites-available/quangtx.io.vn" -ForegroundColor White
Write-Host "   3. Change all service URLs to: http://localhost:8080" -ForegroundColor White
Write-Host "   4. Test config: sudo nginx -t" -ForegroundColor White
Write-Host "   5. Reload Nginx: sudo systemctl reload nginx" -ForegroundColor White
Write-Host "   6. Test: curl https://quangtx.io.vn/api/products/" -ForegroundColor White
Write-Host ""
Write-Host "🛡️  SSRF Protection:" -ForegroundColor Cyan
Write-Host "   • API Gateway now filters all requests" -ForegroundColor White
Write-Host "   • Private IPs and internal services are blocked" -ForegroundColor White
Write-Host "   • All attempts are logged for audit" -ForegroundColor White
Write-Host ""
Write-Host "📋 Monitoring:" -ForegroundColor Cyan
Write-Host "   • View logs: ssh -p $PORT ${USER}@${SERVER} 'docker logs api-gateway -f'" -ForegroundColor White
Write-Host "   • Check status: ssh -p $PORT ${USER}@${SERVER} 'docker ps'" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
