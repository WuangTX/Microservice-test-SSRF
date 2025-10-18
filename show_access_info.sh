#!/bin/bash

echo "=========================================="
echo "  📡 MICROSERVICE SYSTEM ACCESS INFO"
echo "=========================================="
echo ""

# Lấy IP chính (không phải localhost)
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "🖥️  Server IP: $SERVER_IP"
echo ""
echo "🌐 Access URLs:"
echo "   Main (with Nginx):  http://$SERVER_IP"
echo "   Frontend:           http://$SERVER_IP:3000"
echo "   User Service:       http://$SERVER_IP:8081"
echo "   Product Service:    http://$SERVER_IP:8082"
echo "   Inventory Service:  http://$SERVER_IP:8083"
echo ""
echo "📝 Login credentials:"
echo "   Admin:"
echo "     - Username: admin"
echo "     - Password: admin123"
echo ""
echo "   Test Users:"
echo "     - Username: user1, user2, user3"
echo "     - Password: user123"
echo ""
echo "🔍 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -7
echo ""
echo "=========================================="
echo "📋 Quick Commands:"
echo "   View logs:     docker compose logs -f [service-name]"
echo "   Restart all:   docker compose restart"
echo "   Stop all:      docker compose down"
echo "=========================================="
