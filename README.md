# Microservice Shop - E-commerce System with SSRF Vulnerability

Hệ thống microservice shop bán hàng với lỗ hổng SSRF được xây dựng cho mục đích học tập và nghiên cứu bảo mật.

## 🏗️ Kiến trúc hệ thống

Hệ thống bao gồm 4 microservices:

1. **User Service** (Spring Boot - Port 8081)
   - Quản lý người dùng và xác thực
   - Đăng ký, đăng nhập với JWT
   - CRUD operations cho admin
   - **VULNERABLE**: Endpoint `/api/users/delete/{id}` không yêu cầu xác thực

2. **Product Service** (Django - Port 8082)
   - Quản lý sản phẩm
   - CRUD operations cho products
   - Quản lý sizes và inventory

3. **Inventory Service** (Flask - Port 8083)
   - Quản lý tồn kho
   - **VULNERABLE**: Chấp nhận parameter `callback_url` và thực hiện request mà không validate
   - Lỗ hổng SSRF cho phép attacker gọi internal services

4. **Frontend** (React - Port 3000)
   - Giao diện người dùng
   - Trang sản phẩm, chi tiết sản phẩm
   - Admin panel để quản lý products và users

## 🚀 Cách chạy

### Yêu cầu
- Docker Desktop
- Docker Compose

### Khởi động hệ thống

```powershell
# Clone hoặc download source code
cd microservice_lab

# Build và khởi động tất cả services
docker-compose up --build

# Hoặc chạy ở chế độ background
docker-compose up -d --build
```

### Dừng hệ thống

```powershell
docker-compose down

# Xóa cả volumes (database data)
docker-compose down -v
```

## 🔐 Tài khoản mặc định

Sau khi hệ thống khởi động, bạn cần đăng ký tài khoản:

### Đăng ký Admin:
- Username: admin
- Email: admin@example.com
- Password: admin123

### Đăng ký User thường:
- Username: user1
- Email: user1@example.com
- Password: user123

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **User Service API**: http://localhost:8081
- **Product Service API**: http://localhost:8082
- **Inventory Service API**: http://localhost:8083

## ⚠️ Lỗ hổng SSRF

### Mô tả lỗ hổng

Inventory Service có một lỗ hổng SSRF (Server-Side Request Forgery) tại endpoint:

```
GET /api/inventory/{product_id}/{size}?callback_url={url}
```

Service sẽ thực hiện một HTTP request đến `callback_url` mà không validate, cho phép attacker:
- Truy cập internal services
- Gọi các endpoints không được expose ra ngoài
- Bypass authentication

### Cách khai thác

1. Truy cập trang chi tiết sản phẩm
2. Chọn size để xem số lượng tồn kho
3. Trong phần "SSRF Vulnerability Demo", nhập callback URL:

```
http://user-service:8081/api/users/delete/1
```

4. Click "Trigger SSRF Attack"
5. Inventory service sẽ gọi endpoint xóa user, bypass authentication!

### Ví dụ exploit URLs:

```bash
# Xóa user có ID = 1
http://user-service:8081/api/users/delete/1

# Xóa user có ID = 2
http://user-service:8081/api/users/delete/2

# Có thể thử với các internal services khác
http://user-service:8081/api/users
```

## 📝 API Endpoints

### User Service (8081)

```
POST   /api/auth/register     - Đăng ký tài khoản mới
POST   /api/auth/login        - Đăng nhập
GET    /api/users             - Lấy danh sách users (Admin only)
GET    /api/users/{id}        - Lấy thông tin user (Admin only)
PUT    /api/users/{id}        - Cập nhật user (Admin only)
DELETE /api/users/delete/{id} - Xóa user (VULNERABLE - No auth required!)
```

### Product Service (8082)

```
GET    /api/products/          - Lấy danh sách sản phẩm
GET    /api/products/{id}/     - Lấy chi tiết sản phẩm
POST   /api/products/          - Tạo sản phẩm mới
PUT    /api/products/{id}/     - Cập nhật sản phẩm
DELETE /api/products/{id}/     - Xóa sản phẩm
```

### Inventory Service (8083)

```
GET    /api/inventory/{product_id}/{size}                    - Lấy tồn kho
GET    /api/inventory/{product_id}/{size}?callback_url={url} - SSRF VULNERABLE!
GET    /api/inventory/{product_id}                           - Lấy tất cả tồn kho của sản phẩm
PUT    /api/inventory/{product_id}/{size}                    - Cập nhật tồn kho
```

## 🎯 Tính năng

### Người dùng thường:
- ✅ Đăng ký, đăng nhập
- ✅ Xem danh sách sản phẩm
- ✅ Xem chi tiết sản phẩm
- ✅ Chọn size và xem số lượng tồn kho

### Admin:
- ✅ Tất cả tính năng của user
- ✅ Thêm/Sửa/Xóa sản phẩm
- ✅ Quản lý sizes và số lượng
- ✅ Xem/Sửa/Xóa users

## 🛠️ Stack công nghệ

- **Backend**:
  - Spring Boot 3.1.5 (Java 17)
  - Django 4.2.7 (Python 3.11)
  - Flask 3.0.0 (Python 3.11)
  
- **Frontend**:
  - React 18.2.0
  - React Router 6.20.0
  - Axios

- **Database**:
  - PostgreSQL 15

- **Containerization**:
  - Docker
  - Docker Compose

## ⚠️ Cảnh báo

Hệ thống này được xây dựng **CHỈ CHO MỤC ĐÍCH HỌC TẬP** về lỗ hổng bảo mật SSRF. 

**KHÔNG** sử dụng trong môi trường production!

## 📚 Học thêm về SSRF

- [OWASP - Server Side Request Forgery](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery)
- [PortSwigger - SSRF](https://portswigger.net/web-security/ssrf)

## 🔧 Troubleshooting

### Services không start được

```powershell
# Kiểm tra logs
docker-compose logs user-service
docker-compose logs product-service
docker-compose logs inventory-service

# Restart services
docker-compose restart
```

### Port đã được sử dụng

Sửa file `docker-compose.yml` để thay đổi ports:

```yaml
ports:
  - "8081:8081"  # Thay 8081 thành port khác
```

### Database connection errors

```powershell
# Xóa volumes và rebuild
docker-compose down -v
docker-compose up --build
```

## 📄 License

MIT License - Chỉ cho mục đích học tập và nghiên cứu.
