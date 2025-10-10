@echo off
echo Starting Microservice Shop System...
echo ========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

echo Building Docker images...
docker-compose build

echo Starting services...
docker-compose up -d

echo.
echo Waiting for services to be ready...
timeout /t 15 /nobreak >nul

echo.
echo System is starting up!
echo ========================================
echo Frontend:          http://localhost:3000
echo User Service:      http://localhost:8081
echo Product Service:   http://localhost:8082
echo Inventory Service: http://localhost:8083
echo ========================================
echo.
echo Next steps:
echo 1. Open http://localhost:3000 in your browser
echo 2. Register an account (use role: ADMIN for first user)
echo 3. Create some products in admin panel
echo 4. Test the SSRF vulnerability on product detail pages
echo.
echo View logs:
echo    docker-compose logs -f [service-name]
echo.
echo Stop system:
echo    docker-compose down
echo.

pause
