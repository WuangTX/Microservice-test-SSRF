# 🐧 Hướng dẫn Deploy lên Ubuntu Server

## 📋 Yêu cầu hệ thống
- Ubuntu Server 20.04 LTS trở lên
- RAM: Tối thiểu 4GB (khuyến nghị 8GB)
- Disk: Tối thiểu 20GB
- CPU: 2 cores trở lên

## 🚀 Hướng dẫn chi tiết

### Bước 1: Setup Ubuntu Server

```bash
# Upload setup_ubuntu.sh lên server
scp setup_ubuntu.sh user@your-server-ip:~/

# SSH vào server
ssh user@your-server-ip

# Cấp quyền thực thi
chmod +x setup_ubuntu.sh

# Chạy setup script
./setup_ubuntu.sh
```

Script này sẽ tự động:
- ✅ Update hệ thống
- ✅ Cài đặt Docker & Docker Compose
- ✅ Cài đặt Python3 và thư viện cần thiết
- ✅ Cấu hình firewall
- ✅ Khởi động Docker service

**⚠️ LƯU Ý:** Sau khi script chạy xong, bạn cần **log out và log in lại** để Docker group có hiệu lực.

### Bước 2: Upload Source Code

```bash
# Trên máy local, upload code lên server
scp -r microservice_lab user@your-server-ip:~/

# Hoặc dùng Git
ssh user@your-server-ip
git clone https://github.com/WuangTX/Microservice-test-SSRF.git
cd Microservice-test-SSRF
```

### Bước 3: Khởi động hệ thống

```bash
# Cấp quyền thực thi cho các script
chmod +x start.sh seed_data.sh

# Khởi động Docker containers
./start.sh
```

**Output:**
```
🚀 Starting Microservice Shop System...
========================================
📦 Building Docker images...
🏃 Starting services...
⏳ Waiting for services to be ready...
✅ System is starting up!
```

### Bước 4: Chờ services khởi động

```bash
# Đợi khoảng 30-60 giây để services khởi động hoàn toàn
# Kiểm tra trạng thái containers
docker ps
```

Bạn sẽ thấy 6 containers đang chạy:
- `frontend` (React)
- `user-service` (Spring Boot)
- `product-service` (Django)
- `inventory-service` (Flask)
- `postgres-user`
- `postgres-product`

### Bước 5: Seed dữ liệu (TẠO USERS & PRODUCTS)

```bash
# Chạy script seed data
./seed_data.sh
```

**Output:**
```
🚀 BẮT ĐẦU SEED DỮ LIỆU CHO MICROSERVICE SHOP
============================================================
🔐 Tạo tài khoản admin...
✅ Tạo admin thành công: admin

👥 Tạo test users...
✅ Tạo user: user1
✅ Tạo user: user2
✅ Tạo user: user3

🛍️  Tạo sản phẩm mẫu...
✅ Tạo sản phẩm: Premium Cotton T-Shirt (ID: 1)
✅ Tạo sản phẩm: Classic Blue Jeans (ID: 2)
✅ Tạo sản phẩm: Sport Running Shoes (ID: 3)
✅ Tạo sản phẩm: Casual Hoodie (ID: 4)
✅ Tạo sản phẩm: Summer Dress (ID: 5)
✅ Tạo sản phẩm: Leather Jacket (ID: 6)

✅ HOÀN TẤT SEED DỮ LIỆU!
```

**⚠️ QUAN TRỌNG:** Nếu bạn KHÔNG chạy `seed_data.sh`, hệ thống sẽ KHÔNG có:
- ❌ Tài khoản admin
- ❌ Tài khoản users
- ❌ Sản phẩm nào cả

## 🌐 Truy cập ứng dụng

Mở trình duyệt và truy cập:
```
http://YOUR_SERVER_IP:3000
```

**Thay `YOUR_SERVER_IP` bằng IP thực của server Ubuntu của bạn.**

### 📝 Thông tin đăng nhập

**Admin:**
- Username: `admin`
- Password: `admin123`

**Test Users:**
- Username: `user1`, `user2`, `user3`
- Password: `user123`

## 🔍 Kiểm tra và Troubleshooting

### 1. Kiểm tra containers
```bash
# Xem tất cả containers
docker ps

# Format đẹp hơn
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

### 2. Xem logs
```bash
# Xem logs tất cả services
docker-compose logs

# Xem logs một service cụ thể
docker-compose logs -f user-service
docker-compose logs -f product-service
docker-compose logs -f inventory-service
docker-compose logs -f frontend

# Xem 50 dòng logs cuối
docker-compose logs --tail=50 product-service
```

### 3. Kiểm tra kết nối API

```bash
# Test User Service
curl http://localhost:8081/api/auth/login

# Test Product Service
curl http://localhost:8082/api/products/

# Test Inventory Service
curl http://localhost:8083/health
```

### 4. Restart services nếu cần

```bash
# Restart một service cụ thể
docker-compose restart user-service

# Restart tất cả
docker-compose restart

# Stop và start lại
docker-compose down
docker-compose up -d
```

### 5. Xóa và rebuild nếu có lỗi

```bash
# Dừng và xóa containers
docker-compose down

# Xóa images cũ (optional)
docker system prune -a

# Build lại từ đầu
docker-compose build --no-cache

# Start lại
docker-compose up -d

# Chờ 30 giây rồi seed data lại
sleep 30
./seed_data.sh
```

## 🔥 Lỗi thường gặp và cách fix

### Lỗi 1: "Connection refused" khi chạy seed_data.sh

**Nguyên nhân:** Services chưa khởi động xong

**Cách fix:**
```bash
# Đợi lâu hơn (1-2 phút)
sleep 60

# Kiểm tra logs
docker-compose logs user-service | tail -20
docker-compose logs product-service | tail -20

# Chạy lại seed script
./seed_data.sh
```

### Lỗi 2: "Cannot connect to Docker daemon"

**Nguyên nhân:** User chưa có quyền docker hoặc Docker chưa chạy

**Cách fix:**
```bash
# Kiểm tra Docker service
sudo systemctl status docker

# Start Docker nếu chưa chạy
sudo systemctl start docker

# Add user vào docker group
sudo usermod -aG docker $USER

# Log out và log in lại
exit
# SSH lại vào server
```

### Lỗi 3: Port bị chiếm

**Nguyên nhân:** Port đã được sử dụng bởi process khác

**Cách fix:**
```bash
# Kiểm tra port nào đang được dùng
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8081
sudo netstat -tulpn | grep :8082

# Kill process nếu cần
sudo kill -9 <PID>

# Hoặc đổi port trong docker-compose.yml
```

### Lỗi 4: Database connection error

**Nguyên nhân:** PostgreSQL chưa sẵn sàng khi service start

**Cách fix:**
```bash
# Restart services theo thứ tự
docker-compose restart postgres-user postgres-product
sleep 10
docker-compose restart user-service product-service

# Xem logs để debug
docker-compose logs postgres-user
docker-compose logs user-service
```

### Lỗi 5: Frontend không kết nối được API

**Nguyên nhân:** CORS hoặc environment variable không đúng

**Cách fix:**
```bash
# Kiểm tra API từ server
curl http://localhost:8081/api/auth/login
curl http://localhost:8082/api/products/

# Nếu API hoạt động nhưng frontend không connect được
# Kiểm tra browser console (F12)
# Có thể cần update CORS settings trong backend
```

## 📊 Monitoring

### Xem resource usage
```bash
# CPU, Memory của containers
docker stats

# Disk usage
docker system df
```

### Xem network
```bash
# List networks
docker network ls

# Inspect network
docker network inspect microservice_lab_microservice-network
```

## 🛑 Dừng hệ thống

```bash
# Dừng tất cả containers
docker-compose down

# Dừng và xóa volumes (xóa database)
docker-compose down -v

# Dừng và xóa tất cả (containers, images, volumes)
docker-compose down --rmi all -v
```

## 🔐 Bảo mật cho Production

**⚠️ QUAN TRỌNG:** Hệ thống này được thiết kế cho LAB/TESTING. Nếu deploy production:

1. **Đổi passwords:**
   - Database passwords
   - Admin credentials
   - JWT secret keys

2. **Cấu hình HTTPS:**
   - Sử dụng nginx reverse proxy
   - Cài đặt SSL certificates (Let's Encrypt)

3. **Firewall:**
   - Chỉ mở port 443 (HTTPS)
   - Đóng các port 8081, 8082, 8083
   - Chỉ cho phép IP cụ thể SSH vào

4. **Environment Variables:**
   - Dùng Docker secrets hoặc .env file
   - Không commit sensitive data lên Git

5. **Backup:**
   - Backup database định kỳ
   - Backup volumes

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs: `docker-compose logs`
2. Kiểm tra container status: `docker ps -a`
3. Tham khảo phần troubleshooting ở trên
4. Mở issue trên GitHub repository

---

**Good luck với deployment! 🚀**
