#!/bin/bash

# Script khởi động lại toàn bộ hệ thống sau khi IP thay đổi
# Dữ liệu được giữ nguyên trong Docker volumes

echo "=============================================="
echo "  Restart Microservice với IP mới"
echo "=============================================="
echo ""

# 1. Lấy IP mới
NEW_IP=$(hostname -I | awk '{print $1}')
echo "✓ IP hiện tại: $NEW_IP"

# 2. Stop các services (không xóa volumes)
echo ""
echo "📦 Dừng services..."
cd /home/ubuntu/Microservice-test-SSRF
docker compose down

# 3. Copy nginx config mới (nếu cần)
if [ -f "nginx-proxy-local.conf" ]; then
    cp nginx-proxy-local.conf nginx-proxy.conf
    echo "✓ Nginx config updated"
fi

# 4. Start lại services (dữ liệu vẫn còn trong volumes)
echo ""
echo "🚀 Khởi động lại services..."
docker compose up -d

# 5. Đợi services khởi động
echo ""
echo "⏳ Đợi services khởi động..."
sleep 10

# 6. Kiểm tra trạng thái
echo ""
echo "=============================================="
echo "  Kiểm tra trạng thái:"
echo "=============================================="
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}"

# 7. Kiểm tra volumes
echo ""
echo "✓ Docker volumes (dữ liệu vẫn còn):"
docker volume ls | grep "microservice-test-ssrf" | awk '{print "  - " $2}'

# 8. Test services
echo ""
echo "=============================================="
echo "  Test Services:"
echo "=============================================="
echo ""

sleep 5

# Test user service
echo "1. User Service:"
curl -s http://localhost:8081/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -q "token" && echo "   ✓ OK" || echo "   ✗ Failed"

# Test product service
echo "2. Product Service:"
curl -s http://localhost:8082/api/products/ | grep -q "name" && echo "   ✓ OK" || echo "   ✗ Failed"

# Test inventory service
echo "3. Inventory Service:"
curl -s http://localhost:8083/health 2>/dev/null && echo "   ✓ OK" || echo "   ⚠ No health endpoint"

# Test nginx
echo "4. Nginx Proxy:"
curl -s http://localhost/ | grep -q "html" && echo "   ✓ OK" || echo "   ✗ Failed"

echo ""
echo "=============================================="
echo "  Hoàn tất!"
echo "=============================================="
echo ""
echo "📝 Các bước tiếp theo:"
echo ""
echo "1. Update DNS A Record:"
echo "   Domain: quangtx.io.vn"
echo "   Type: A"
echo "   Value: $NEW_IP"
echo ""
echo "2. Đợi DNS propagate (5-15 phút)"
echo ""
echo "3. Kiểm tra:"
echo "   dig quangtx.io.vn"
echo "   curl http://quangtx.io.vn"
echo ""
echo "✓ Dữ liệu được giữ nguyên trong volumes!"
echo ""
