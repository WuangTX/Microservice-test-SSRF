#!/bin/bash
# Script to update services on server
# Usage: ./update-server.sh

echo "======================================"
echo "Updating Microservices"
echo "======================================"
echo ""

echo "[1/3] Pulling latest images from Docker Hub..."
docker-compose pull

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to pull images!"
    exit 1
fi

echo ""
echo "[2/3] Stopping old containers..."
docker-compose down

echo ""
echo "[3/3] Starting updated containers..."
docker-compose up -d

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
docker-compose ps

echo ""
echo "New SSRF endpoints available:"
echo "  - GET /api/shipping/track?tracking_url=..."
echo "  - GET /api/products/verify-supplier?supplier_url=..."
echo "  - GET /api/warranty/check?warranty_url=..."
echo "  - GET /api/products/load-image?image_url=..."
echo "  - POST /api/products/notify-restock"
echo ""
echo "Test: curl http://localhost:8080/api/shipping/track?tracking_url=http://google.com"
