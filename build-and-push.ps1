# Build and Push Docker Images to Docker Hub
# Usage: .\build-and-push.ps1

$DOCKER_USERNAME = "tranquang04"
$VERSION = "latest"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Building and Pushing Docker Images" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Login to Docker Hub
Write-Host "[1/6] Logging in to Docker Hub..." -ForegroundColor Yellow
docker login
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker login failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/6] Building Product Service..." -ForegroundColor Yellow
Set-Location product-service
docker build -t ${DOCKER_USERNAME}/product-service:${VERSION} .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Product service build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "[3/6] Building User Service..." -ForegroundColor Yellow
Set-Location ../user-service
docker build -t ${DOCKER_USERNAME}/user-service:${VERSION} .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: User service build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "[4/6] Building Inventory Service..." -ForegroundColor Yellow
Set-Location ../inventory-service
docker build -t ${DOCKER_USERNAME}/inventory-service:${VERSION} .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Inventory service build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "[5/6] Building Order Service..." -ForegroundColor Yellow
Set-Location ../order-service
docker build -t ${DOCKER_USERNAME}/order-service:${VERSION} .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Order service build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "[6/6] Building Frontend..." -ForegroundColor Yellow
Set-Location ../frontend
docker build -t ${DOCKER_USERNAME}/frontend:${VERSION} .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Pushing Images to Docker Hub" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Pushing product-service..." -ForegroundColor Yellow
docker push ${DOCKER_USERNAME}/product-service:${VERSION}

Write-Host ""
Write-Host "Pushing user-service..." -ForegroundColor Yellow
docker push ${DOCKER_USERNAME}/user-service:${VERSION}

Write-Host ""
Write-Host "Pushing inventory-service..." -ForegroundColor Yellow
docker push ${DOCKER_USERNAME}/inventory-service:${VERSION}

Write-Host ""
Write-Host "Pushing order-service..." -ForegroundColor Yellow
docker push ${DOCKER_USERNAME}/order-service:${VERSION}

Write-Host ""
Write-Host "Pushing frontend..." -ForegroundColor Yellow
docker push ${DOCKER_USERNAME}/frontend:${VERSION}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ All images built and pushed successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images:" -ForegroundColor Cyan
Write-Host "  - ${DOCKER_USERNAME}/product-service:${VERSION}" -ForegroundColor White
Write-Host "  - ${DOCKER_USERNAME}/user-service:${VERSION}" -ForegroundColor White
Write-Host "  - ${DOCKER_USERNAME}/inventory-service:${VERSION}" -ForegroundColor White
Write-Host "  - ${DOCKER_USERNAME}/order-service:${VERSION}" -ForegroundColor White
Write-Host "  - ${DOCKER_USERNAME}/frontend:${VERSION}" -ForegroundColor White
Write-Host ""
Write-Host "Next steps on server:" -ForegroundColor Yellow
Write-Host "  1. Pull latest docker-compose.yml" -ForegroundColor White
Write-Host "  2. Run: docker-compose pull" -ForegroundColor White
Write-Host "  3. Run: docker-compose up -d" -ForegroundColor White
