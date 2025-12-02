# 🚀 CẢI TIẾN MICROSERVICE - INTER-SERVICE COMMUNICATION

## ✅ Đã hoàn thành:

### 1. **Cải tiến A: Product Service gọi Inventory Service**
- **File:** `product-service/products/views.py`
- **Thay đổi:** Method `retrieve()` bây giờ gọi `inventory-service:8083` để lấy tồn kho realtime
- **Luồng:** Frontend → Product API → Inventory API → Response với inventory data

### 2. **Cải tiến C: Tạo Order Service (Microservice mới)**
- **Thư mục:** `order-service/`
- **Database riêng:** PostgreSQL `postgres-order` với volume `postgres_order_data`
- **Port:** 8084
- **Chức năng:**
  - ✅ **POST /api/orders** - Tạo đơn hàng với 5 bước:
    1. Verify user qua `user-service:8081`
    2. Get product detail qua `product-service:8082`
    3. Check inventory qua `inventory-service:8083`
    4. Decrease stock qua `inventory-service:8083`
    5. Lưu order vào database riêng
  - ✅ **GET /api/orders** - Lấy danh sách đơn hàng (filter by user_id)
  - ✅ **GET /api/orders/{id}** - Chi tiết đơn hàng
  - ✅ **PATCH /api/orders/{id}** - Update trạng thái
  - ✅ **DELETE /api/orders/{id}** - Hủy đơn và restore inventory

### 3. **Frontend Components mới:**
- **Checkout.js** - Trang đặt hàng với:
  - Chọn sản phẩm
  - Hiển thị inventory realtime
  - Chọn size và số lượng
  - Tính tổng tiền
  - Submit order (gọi order-service)
  
- **OrderHistory.js** - Lịch sử đơn hàng:
  - Hiển thị tất cả orders của user
  - Status badges màu sắc
  - Nút hủy đơn hàng

### 4. **Navigation mới:**
- "Đặt hàng" → `/checkout`
- "Đơn hàng của tôi" → `/orders`

---

## 📦 Docker Images đã push:

```
✅ tranquang04/product-service:latest (digest: bc0bf44...)
✅ tranquang04/order-service:latest (digest: 8ce69c6...)
✅ tranquang04/frontend:latest (digest: a9fcd64...)
```

---

## 🔧 CÁC FILE ĐÃ SỬA:

1. **product-service/products/views.py**
   - Thêm method `retrieve()` gọi inventory-service

2. **product-service/products/urls.py**
   - Fix trailing slash cho SSRF endpoints

3. **docker-compose.yml**
   - Thêm `postgres-order` container
   - Thêm `order-service` container
   - Thêm `postgres_order_data` volume
   - Update nginx depends_on

4. **nginx-proxy.conf**
   - Thêm routing `/api/orders` → `order-service:8084`

5. **frontend/src/App.js**
   - Import Checkout và OrderHistory
   - Thêm 2 routes mới
   - Update navigation menu

6. **frontend/src/services/api.js**
   - Thêm `orderServiceAPI` với 5 methods
   - Thêm `getProducts()` và `getProductDetail()` methods

7. **build-and-push.ps1**
   - Update từ [1/5] thành [1/6]
   - Thêm build step cho order-service
   - Thêm push step cho order-service

---

## 🌐 DEPLOY LÊN SERVER:

### Bước 1: SSH vào server
```bash
ssh quang@103.56.163.193 -p 24700
# Password: quang2222
```

### Bước 2: Pull docker-compose.yml mới
```bash
cd ~/microservice-shop
# Copy docker-compose.yml từ local hoặc dùng git pull
```

### Bước 3: Pull nginx config mới
```bash
# Copy nginx-proxy.conf từ local hoặc dùng git pull
```

### Bước 4: Pull images mới
```bash
docker pull tranquang04/product-service:latest
docker pull tranquang04/order-service:latest
docker pull tranquang04/frontend:latest
```

### Bước 5: Restart services
```bash
# Stop và remove containers cũ
docker-compose -f docker-compose.prod.yml down

# Start lại với config mới
docker-compose -f docker-compose.prod.yml up -d

# Restart nginx để resolve upstream IPs mới
docker restart nginx-proxy
```

### Bước 6: Kiểm tra logs
```bash
docker logs order-service
docker logs product-service
docker logs nginx-proxy
```

### Bước 7: Test inter-service calls
```bash
# Test product detail có inventory
curl -sS http://localhost/api/products/7/ | jq .

# Test create order
curl -X POST http://localhost/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "product_id": 7,
    "size": "M",
    "quantity": 1
  }' | jq .

# Test get orders
curl http://localhost/api/orders?user_id=1 | jq .
```

---

## 🔗 LUỒNG INTER-SERVICE COMMUNICATION:

### Khi xem Product Detail:
```
User → Frontend
     → Product API (GET /api/products/7/)
        → Product Service retrieve()
           → Inventory Service (GET /api/inventory/7)
        ← Response với inventory: {S: 10, M: 15, L: 20}
     ← Hiển thị product + tồn kho realtime
```

### Khi tạo Order:
```
User → Frontend (Checkout)
     → Order API (POST /api/orders)
        → Order Service create_order()
           1. → User Service (verify user exists)
           2. → Product Service (get product detail + price)
           3. → Inventory Service (check stock available)
           4. → Inventory Service (decrease stock)
           5. → Save order to database
        ← Order created successfully
     ← Hiển thị order confirmation
```

---

## 📊 KIẾN TRÚC SAU CẢI TIẾN:

```
┌─────────────┐
│  Frontend   │
│   (React)   │
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Nginx Proxy  │
│  Port: 8080  │
└──────┬───────┘
       │
       ├─► User Service (8081) ──► postgres-user
       │
       ├─► Product Service (8082) ──┬─► postgres-product
       │                             │
       │                             └─► Inventory Service (8083)
       │
       ├─► Inventory Service (8083)
       │
       └─► Order Service (8084) ──┬─► postgres-order
                                   │
                                   ├─► User Service (verify)
                                   ├─► Product Service (get price)
                                   └─► Inventory Service (stock mgmt)
```

---

## ✨ DEMO SCENARIOS:

### Scenario 1: Xem sản phẩm với tồn kho realtime
1. Vào https://quangtx.io.vn
2. Click vào 1 sản phẩm
3. **Thấy inventory realtime** (không có trước đây)

### Scenario 2: Đặt hàng thành công
1. Login với user bình thường
2. Click "Đặt hàng"
3. Chọn sản phẩm (thấy inventory)
4. Chọn size M (còn 15)
5. Nhập số lượng 2
6. Click "Đặt hàng ngay"
7. **Backend gọi 4 services khác** → Tạo order thành công

### Scenario 3: Xem lịch sử đơn hàng
1. Click "Đơn hàng của tôi"
2. Thấy tất cả orders đã đặt
3. Click "Hủy đơn hàng"
4. **Backend restore inventory** qua inventory-service

---

## 🎯 KẾT LUẬN:

Bây giờ hệ thống đã có **inter-service communication thực tế**:
- ✅ Product Service → Inventory Service (realtime stock)
- ✅ Order Service → User Service (verify user)
- ✅ Order Service → Product Service (get price)
- ✅ Order Service → Inventory Service (stock management)

Đây là kiến trúc microservice **THẬT**, không còn là các service độc lập nữa! 🚀
