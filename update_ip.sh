#!/bin/bash

# Script tự động cập nhật IP mới cho domain
# Sử dụng khi IP của Ubuntu VMware thay đổi

echo "=============================================="
echo "  Script Cập Nhật IP cho Domain"
echo "=============================================="
echo ""

# 1. Lấy IP hiện tại của Ubuntu
CURRENT_IP=$(hostname -I | awk '{print $1}')
echo "✓ IP hiện tại của Ubuntu: $CURRENT_IP"

# 2. Domain của bạn
DOMAIN="quangtx.io.vn"
echo "✓ Domain: $DOMAIN"

echo ""
echo "=============================================="
echo "  Các bước cần làm:"
echo "=============================================="
echo ""
echo "1. Truy cập nhà cung cấp domain của bạn (VD: GoDaddy, Namecheap, Cloudflare, etc.)"
echo ""
echo "2. Tìm DNS Management / DNS Records"
echo ""
echo "3. Cập nhật A Record:"
echo "   - Host/Name: @ hoặc $DOMAIN"
echo "   - Type: A"
echo "   - Value/Points to: $CURRENT_IP"
echo "   - TTL: 300 (5 phút) hoặc 600 (10 phút)"
echo ""
echo "4. Lưu thay đổi và đợi DNS propagate (2-15 phút)"
echo ""
echo "=============================================="
echo "  Kiểm tra DNS hiện tại:"
echo "=============================================="
echo ""

# Kiểm tra DNS hiện tại
CURRENT_DNS=$(dig +short $DOMAIN @8.8.8.8 | tail -n1)
if [ -n "$CURRENT_DNS" ]; then
    echo "DNS hiện tại của $DOMAIN: $CURRENT_DNS"
    
    if [ "$CURRENT_DNS" = "$CURRENT_IP" ]; then
        echo "✓ DNS đã trỏ đúng về IP hiện tại!"
    else
        echo "⚠ DNS chưa trỏ về IP mới!"
        echo "  Cần cập nhật: $CURRENT_DNS → $CURRENT_IP"
    fi
else
    echo "⚠ Không tìm thấy DNS record cho $DOMAIN"
fi

echo ""
echo "=============================================="
echo "  Kiểm tra Docker Services:"
echo "=============================================="
echo ""

# Kiểm tra Docker services
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "Up"; then
    echo "✓ Docker services đang chạy:"
    docker ps --format "  - {{.Names}}: {{.Status}}"
else
    echo "⚠ Không có Docker service nào đang chạy!"
    echo "  Chạy: docker compose up -d"
fi

echo ""
echo "=============================================="
echo "  Kiểm tra Data Volumes:"
echo "=============================================="
echo ""

# Kiểm tra volumes
echo "✓ Docker volumes (dữ liệu được lưu):"
docker volume ls | grep "microservice-test-ssrf" | awk '{print "  - " $2}'

echo ""
echo "=============================================="
echo "  Tóm tắt:"
echo "=============================================="
echo ""
echo "IP Ubuntu hiện tại: $CURRENT_IP"
echo "Domain: $DOMAIN"
echo "DNS hiện tại: ${CURRENT_DNS:-'Chưa có'}"
echo ""
echo "📝 Ghi chú:"
echo "  - Dữ liệu PostgreSQL được lưu trong Docker volumes"
echo "  - Khi IP thay đổi, chỉ cần update DNS A Record"
echo "  - Không cần restart Docker hay mất dữ liệu"
echo "  - Sau khi update DNS, đợi 5-15 phút để propagate"
echo ""
echo "🔍 Kiểm tra sau khi update DNS:"
echo "  dig $DOMAIN"
echo "  curl -I http://$DOMAIN"
echo ""
