# Hướng dẫn cài đặt và chạy hệ thống Microservice Shop

## 📋 Yêu cầu hệ thống

- **Docker Desktop**: Phiên bản mới nhất (đã bật và đang chạy)
- **RAM**: Tối thiểu 4GB khả dụng cho Docker
- **Dung lượng**: ~2GB cho Docker images
- **Browser**: Chrome, Firefox, hoặc Edge

## 🚀 Hướng dẫn khởi động

### Bước 1: Kiểm tra Docker

Mở PowerShell hoặc Command Prompt và chạy:

```powershell
docker --version
docker-compose --version
```

Nếu chưa cài Docker Desktop, tải tại: https://www.docker.com/products/docker-desktop

### Bước 2: Khởi động hệ thống

#### Trên Windows (PowerShell hoặc CMD):

```powershell
cd c:\Users\ASUS-PRO\Desktop\microservice_lab
docker-compose up --build
```

Hoặc dùng script:

```powershell
.\start.bat
```

#### Chạy ở background (không hiển thị logs):

```powershell
docker-compose up -d --build
```

### Bước 3: Đợi services khởi động

Hệ thống cần khoảng 1-2 phút để:
- Build Docker images
- Khởi động PostgreSQL databases
- Migrate database schemas
- Start các microservices

Bạn sẽ thấy logs như:
```
✅ user-service started on port 8081
✅ product-service started on port 8082
✅ inventory-service started on port 8083
✅ frontend started on port 3000
```

### Bước 4: Truy cập ứng dụng

Mở browser và truy cập:

🌐 **http://localhost:3000**

## 👤 Tạo tài khoản và sử dụng

### Đăng ký tài khoản Admin (làm đầu tiên)

1. Click "Register" trên navbar
2. Điền thông tin:
   - **Username**: admin
   - **Email**: admin@example.com
   - **Password**: admin123
3. Click "Register"
4. Bạn sẽ tự động đăng nhập

### Tạo sản phẩm (Admin)

1. Click "Manage Products" trên navbar
2. Click "Add New Product"
3. Điền thông tin sản phẩm:
   - **Name**: T-Shirt Premium
   - **Description**: High quality cotton t-shirt
   - **Price**: 29.99
   - **Image URL**: https://via.placeholder.com/400x300?text=T-Shirt
   - **Sizes**: Nhập số lượng cho mỗi size (S, M, L, XL)
4. Click "Create"

Tạo thêm vài sản phẩm nữa để có data đầy đủ!

### Đăng ký user thường để test

1. Logout khỏi admin
2. Register tài khoản mới với role "USER"
3. Xem sản phẩm và test SSRF

## 🔐 Test lỗ hổng SSRF

### Bước 1: Tạo thêm users để test xóa

Từ tài khoản admin:
1. Đăng ký thêm 2-3 users
2. Vào "Manage Users" để xem danh sách và ghi nhớ ID của users

### Bước 2: Khai thác SSRF

1. Vào trang chủ, click vào một sản phẩm
2. Chọn một size (S, M, L, hoặc XL)
3. Scroll xuống phần "⚠️ SSRF Vulnerability Demo"
4. Trong ô "Callback URL", nhập:
   ```
   http://user-service:8081/api/users/delete/2
   ```
   (Thay số 2 bằng ID của user bạn muốn xóa)

5. Click "Trigger SSRF Attack"
6. Bạn sẽ thấy alert: "SSRF request sent! Check inventory service logs."

### Bước 3: Xác nhận user đã bị xóa

1. Vào "Manage Users" (cần đăng nhập admin)
2. User với ID=2 đã biến mất!

### Bước 4: Xem logs để hiểu cách exploit hoạt động

```powershell
docker-compose logs inventory-service
```

Bạn sẽ thấy:
```
[SSRF VULNERABILITY] Making request to: http://user-service:8081/api/users/delete/2
[SSRF VULNERABILITY] Response status: 200
[SSRF VULNERABILITY] Response body: User deleted successfully
```

## 🛠️ Các lệnh hữu ích

### Xem logs của tất cả services

```powershell
docker-compose logs -f
```

### Xem logs của một service cụ thể

```powershell
docker-compose logs -f user-service
docker-compose logs -f product-service
docker-compose logs -f inventory-service
docker-compose logs -f frontend
```

### Restart một service

```powershell
docker-compose restart user-service
```

### Dừng hệ thống

```powershell
docker-compose down
```

### Dừng và xóa tất cả data (databases)

```powershell
docker-compose down -v
```

### Rebuild một service cụ thể

```powershell
docker-compose up -d --build user-service
```

### Kiểm tra trạng thái containers

```powershell
docker-compose ps
```

## 🌐 API Endpoints

### User Service (http://localhost:8081)

```
POST   /api/auth/register          - Đăng ký
POST   /api/auth/login             - Đăng nhập
GET    /api/users                  - Lấy danh sách users (Admin)
GET    /api/users/{id}             - Lấy user theo ID (Admin)
PUT    /api/users/{id}             - Cập nhật user (Admin)
DELETE /api/users/delete/{id}      - Xóa user (VULNERABLE!)
```

### Product Service (http://localhost:8082)

```
GET    /api/products/              - Lấy tất cả sản phẩm
GET    /api/products/{id}/         - Lấy sản phẩm theo ID
POST   /api/products/              - Tạo sản phẩm mới (Admin)
PUT    /api/products/{id}/         - Cập nhật sản phẩm (Admin)
DELETE /api/products/{id}/         - Xóa sản phẩm (Admin)
```

### Inventory Service (http://localhost:8083)

```
GET    /api/inventory/{id}/{size}                    - Lấy tồn kho
GET    /api/inventory/{id}/{size}?callback_url={url} - VULNERABLE SSRF!
PUT    /api/inventory/{id}/{size}                    - Cập nhật tồn kho
```

## 🧪 Test bằng curl/Postman

### Đăng ký user

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "USER"
  }'
```

### Đăng nhập

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Lấy danh sách sản phẩm

```bash
curl http://localhost:8082/api/products/
```

### Test SSRF (xóa user ID=2)

```bash
curl "http://localhost:8083/api/inventory/1/M?callback_url=http://user-service:8081/api/users/delete/2"
```

### Tạo sản phẩm mới

```bash
curl -X POST http://localhost:8082/api/products/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jeans Premium",
    "description": "Stylish blue jeans",
    "price": 59.99,
    "image_url": "https://via.placeholder.com/400x300?text=Jeans",
    "sizes": [
      {"size": "S", "quantity": 10},
      {"size": "M", "quantity": 15},
      {"size": "L", "quantity": 20},
      {"size": "XL", "quantity": 5}
    ]
  }'
```

## ❗ Troubleshooting

### Lỗi: "port already in use"

**Nguyên nhân**: Port 8081, 8082, 8083, hoặc 3000 đã được dùng bởi ứng dụng khác.

**Giải pháp**: 
1. Tìm và dừng ứng dụng đang dùng port:
   ```powershell
   netstat -ano | findstr :8081
   taskkill /PID <PID> /F
   ```
2. Hoặc thay đổi port trong `docker-compose.yml`

### Lỗi: "Cannot connect to database"

**Nguyên nhân**: PostgreSQL chưa sẵn sàng khi service khởi động.

**Giải pháp**:
```powershell
docker-compose restart user-service
docker-compose restart product-service
```

### Lỗi: "Docker daemon is not running"

**Nguyên nhân**: Docker Desktop chưa khởi động.

**Giải pháp**: 
1. Mở Docker Desktop
2. Đợi đến khi Docker hoàn toàn sẵn sàng (biểu tượng xanh)
3. Chạy lại `docker-compose up`

### Frontend không load được

**Nguyên nhân**: Services chưa sẵn sàng hoặc CORS issue.

**Giải pháp**:
1. Kiểm tra tất cả services đang chạy:
   ```powershell
   docker-compose ps
   ```
2. Restart frontend:
   ```powershell
   docker-compose restart frontend
   ```
3. Clear browser cache và reload

### Services bị crash khi start

**Nguyên nhân**: Thiếu RAM hoặc conflict.

**Giải pháp**:
1. Tăng RAM cho Docker (Settings > Resources > Memory)
2. Dừng các ứng dụng khác đang chạy
3. Rebuild lại:
   ```powershell
   docker-compose down -v
   docker-compose up --build
   ```

## 📊 Kiểm tra health của services

### Health check URLs

- User Service: http://localhost:8081/api/users (cần auth)
- Product Service: http://localhost:8082/api/products/
- Inventory Service: http://localhost:8083/health

### Database connection

PostgreSQL databases sẽ tự động được tạo và migrate khi services khởi động.

Để connect trực tiếp vào database:

```powershell
# User DB
docker exec -it postgres-user psql -U postgres -d userdb

# Product DB
docker exec -it postgres-product psql -U postgres -d productdb
```

Trong psql, chạy:
```sql
\dt              -- List tables
SELECT * FROM users;
SELECT * FROM products;
```

## 🎓 Học về SSRF

### Tài liệu

1. **OWASP SSRF**: https://owasp.org/www-community/attacks/Server_Side_Request_Forgery
2. **PortSwigger**: https://portswigger.net/web-security/ssrf
3. **Hướng dẫn chi tiết**: Xem file `SSRF_EXPLOIT_GUIDE.md`

### Video Demo

Xem file `SSRF_EXPLOIT_GUIDE.md` để biết cách thực hiện demo đầy đủ.

## 🔒 Bảo mật

**⚠️ CẢNH BÁO**: Hệ thống này có chứa lỗ hổng bảo mật nghiêm trọng và chỉ dùng cho mục đích học tập!

**KHÔNG BAO GIỜ**:
- Deploy lên production
- Expose ra internet
- Sử dụng với dữ liệu thật

## 📝 Ghi chú thêm

- Mặc định admin có thể thêm/sửa/xóa products và users
- Users thường chỉ có thể xem products
- SSRF vulnerability cho phép bypass authentication
- Database data sẽ mất khi chạy `docker-compose down -v`

## 💡 Mẹo

1. **Tạo nhiều data test**: Tạo nhiều users và products để demo dễ hơn
2. **Xem logs real-time**: Dùng `docker-compose logs -f` để thấy SSRF requests
3. **Test với Postman**: Import các curl commands vào Postman để test API
4. **Network inspect**: Dùng Browser DevTools (F12) để xem các API calls

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker-compose logs`
2. Xem phần Troubleshooting ở trên
3. Rebuild clean: `docker-compose down -v && docker-compose up --build`
