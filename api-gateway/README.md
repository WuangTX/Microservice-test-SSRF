# API Gateway Service

Centralized API Gateway for Microservices Architecture with built-in security features.

## Features

### 🚀 Core Features
- **Request Routing**: Routes requests to appropriate microservices
- **Load Balancing**: Distributes traffic across service instances
- **Rate Limiting**: Prevents API abuse (Redis-based)
- **Authentication**: JWT token validation
- **Logging**: Comprehensive request/response logging

### 🛡️ Security Features
- **SSRF Protection**: Detects and blocks SSRF attempts
- **IP Filtering**: Blocks private IP ranges in requests
- **Header Injection**: Adds user context to downstream services
- **CORS Configuration**: Centralized CORS policy

### 📊 Monitoring
- **Health Checks**: `/actuator/health`
- **Gateway Routes**: `/actuator/gateway/routes`
- **Metrics**: Available via Spring Actuator

## Routes Configuration

| Path | Backend Service | Auth Required | Rate Limit |
|------|----------------|---------------|------------|
| `/api/auth/**` | user-service:8081 | ❌ No | 10 req/s |
| `/api/users/**` | user-service:8081 | ✅ Yes | 20 req/s |
| `/api/products/**` | product-service:8082 | ❌ No | 30 req/s |
| `/api/inventory/**` | inventory-service:8083 | ❌ No | 50 req/s |
| `/api/orders/**` | order-service:8084 | ✅ Yes | 20 req/s |

## SSRF Protection

The gateway includes a **SSRFProtectionFilter** that:

1. **Blocks suspicious patterns**:
   - localhost, 127.0.0.1
   - Private IPs (10.x, 172.x, 192.168.x)
   - Cloud metadata endpoints (169.254.169.254)
   - Internal service names (service, postgres, docker)

2. **Monitors vulnerable endpoints**:
   - `/api/users/*/avatar/validate`
   - `/api/products/*/check_price`
   - `/api/products/*/fetch_review`
   - `/api/products/*/share`

3. **Logs all attempts** for security auditing

## Build & Run

### Local Development
```bash
mvn clean package
java -jar target/api-gateway-1.0.0.jar
```

### Docker
```bash
docker build -t tranquang04/api-gateway:latest .
docker push tranquang04/api-gateway:latest
```

### With Docker Compose
```bash
docker-compose up -d api-gateway
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | Gateway port | 8080 |
| `JWT_SECRET` | JWT signing secret | mySecretKey... |
| `REDIS_HOST` | Redis hostname | redis |
| `REDIS_PORT` | Redis port | 6379 |

## Testing

### Test Authentication
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"user123"}' | jq -r '.token')

# Access protected endpoint
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test SSRF Protection
```bash
# This will be BLOCKED
curl "http://localhost:8080/api/products/1/check_price/?compare_url=http://localhost:8081/api/users"

# Response: 403 Forbidden - SSRF attempt detected
```

### Test Rate Limiting
```bash
# Send 30 requests rapidly
for i in {1..30}; do
  curl http://localhost:8080/api/products/
done

# After rate limit exceeded: 429 Too Many Requests
```

## Logs Analysis

The gateway logs include:
- Request method, path, query parameters
- Client IP address and User-Agent
- Authentication status
- SSRF detection alerts
- Response status codes

Example log:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 [GATEWAY REQUEST] 2025-12-01 10:30:45
   Method: POST
   Path: /api/users/me/avatar/validate
   Client IP: 103.56.163.193
   ⚠️  [SSRF ALERT] Potentially vulnerable endpoint accessed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️  [SSRF PROTECTION] Analyzing request...
   Path: /api/users/me/avatar/validate
   Query: url=http://product-service:8082/api/products
   ❌ BLOCKED: Suspicious pattern detected: service

🚨 [SSRF PROTECTION] REQUEST BLOCKED
   Reason: SSRF attempt detected: suspicious URL pattern
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Architecture

```
Client Request
     ↓
API Gateway (Port 8080)
     ↓
┌────┴────┬────────┬───────────┐
↓         ↓        ↓           ↓
User      Product  Inventory   Order
Service   Service  Service     Service
:8081     :8082    :8083       :8084
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Monitor logs** for SSRF attempts
4. **Configure rate limits** per endpoint
5. **Use Redis** for distributed rate limiting
6. **Enable actuator** only on internal network

## Troubleshooting

### Gateway not starting
- Check Redis is running: `docker ps | grep redis`
- Verify JWT secret is set: `echo $JWT_SECRET`

### Routes not working
- Check actuator: `curl http://localhost:8080/actuator/gateway/routes`
- Verify service hostnames in Docker network

### SSRF filter too strict
- Modify `SSRFProtectionFilter.java` whitelist
- Set `enableStrictMode: false` in config

## License

MIT
