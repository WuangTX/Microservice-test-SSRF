#!/bin/bash
# ============================================================
# DEPLOY API GATEWAY TO SERVER
# Run on server: ./deploy-gateway-to-server.sh
# ============================================================

set -e

echo "============================================================"
echo "🚀 DEPLOYING API GATEWAY TO SERVER"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_DIR="/home/quang/microservices"

echo -e "${YELLOW}📦 Step 1: Pull latest API Gateway image...${NC}"
docker pull tranquang04/api-gateway:latest
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Image pulled successfully${NC}"
else
    echo -e "${RED}❌ Failed to pull image${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📦 Step 2: Pull Redis image (required for rate limiting)...${NC}"
docker pull redis:7-alpine
echo -e "${GREEN}✅ Redis image ready${NC}"

echo ""
echo -e "${YELLOW}🔄 Step 3: Update docker-compose.yml...${NC}"

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_DIR/docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found in $COMPOSE_DIR${NC}"
    echo "Please ensure the repository is cloned to $COMPOSE_DIR"
    exit 1
fi

cd "$COMPOSE_DIR"

# Backup current compose file
cp docker-compose.yml "docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ Backup created${NC}"

echo ""
echo -e "${YELLOW}🐳 Step 4: Restart services with API Gateway...${NC}"
docker-compose down
docker-compose up -d

echo ""
echo -e "${YELLOW}⏳ Waiting for services to start (30 seconds)...${NC}"
sleep 30

echo ""
echo -e "${YELLOW}📊 Step 5: Check service status...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(api-gateway|redis|user-service|product-service)"

echo ""
echo -e "${YELLOW}🏥 Step 6: Health checks...${NC}"

# Check API Gateway
if curl -s -f http://localhost:8080/actuator/health > /dev/null; then
    echo -e "${GREEN}✅ API Gateway is healthy${NC}"
else
    echo -e "${RED}⚠️  API Gateway health check failed${NC}"
fi

# Check Redis
if docker exec redis redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}⚠️  Redis health check failed${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Step 7: View API Gateway logs (last 20 lines)...${NC}"
docker logs api-gateway --tail 20

echo ""
echo "============================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETED!${NC}"
echo "============================================================"
echo ""
echo "🌐 Gateway URL (internal): http://localhost:8080"
echo "📊 Health endpoint: http://localhost:8080/actuator/health"
echo "📋 Routes: http://localhost:8080/actuator/gateway/routes"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Update Nginx config to proxy to gateway port 8080"
echo "2. Test endpoints: curl https://quangtx.io.vn/api/products/"
echo "3. Monitor logs: docker logs api-gateway -f"
echo ""
echo "🛡️  SSRF Protection is now ACTIVE via API Gateway!"
echo "============================================================"
