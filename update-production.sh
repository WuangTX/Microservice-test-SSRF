#!/bin/bash
# Script to update services on production server
# Usage: ./update-production.sh

echo "======================================"
echo "Updating Microservices on Production"
echo "======================================"
echo ""

echo "[1/3] Pulling latest images from Docker Hub..."
docker-compose -f docker-compose.prod.yml pull

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to pull images!"
    exit 1
fi

echo ""
echo "[2/3] Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "[3/3] Starting updated containers..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to start containers!"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ Services updated successfully!"
echo "======================================"
echo ""
echo "Checking container status..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Available SSRF endpoints:"
echo "  - POST /api/products/{id}/check_price/"
echo "  - POST /api/products/{id}/fetch_review/"
echo ""
echo "Test: curl https://quangtx.io.vn/api/products/1/check_price/ -X POST -H 'Content-Type: application/json' -d '{\"compare_url\":\"http://example.com\"}'"
