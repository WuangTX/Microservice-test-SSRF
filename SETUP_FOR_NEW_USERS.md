# 📦 **SETUP GUIDE FOR NEW USERS**
# Hướng dẫn cài đặt cho người mới clone repository

---

## 🎯 **AI LÀ NGƯỜI CẦN ĐỌC FILE NÀY?**

File này dành cho:
- ✅ Người mới clone repository từ GitHub
- ✅ Đồng nghiệp muốn chạy dự án trên máy của họ
- ✅ Bạn trong tương lai khi setup lại dự án

---

## 📋 **BƯỚC 1: CÀI ĐẶT YÊU CẦU**

### **Phần mềm bắt buộc:**

| Phần Mềm | Download Link | Lý Do |
|----------|---------------|-------|
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | Chạy containers |
| **Git** | https://git-scm.com/downloads | Clone repository |

### **Kiểm tra đã cài đặt chưa:**

```bash
# Kiểm tra Docker
docker --version
# Kỳ vọng: Docker version 24.x.x

# Kiểm tra Docker Compose
docker-compose --version
# Kỳ vọng: Docker Compose version v2.x.x

# Kiểm tra Git
git --version
# Kỳ vọng: git version 2.x.x
```

---

## 📥 **BƯỚC 2: CLONE REPOSITORY TỪ GITHUB**

```bash
# Di chuyển đến thư mục muốn lưu dự án
cd C:\Users\<TenMayTinh>\Desktop   # Windows
# hoặc
cd ~/Desktop                        # macOS/Linux

# Clone repository
git clone https://github.com/WuangTX/Microservice-test-SSRF.git

# Vào thư mục dự án
cd Microservice-test-SSRF
```

---

## 🐳 **BƯỚC 3: KHỞI ĐỘNG DOCKER DESKTOP**

### **Windows:**
- Mở **Docker Desktop** từ Start Menu
- Đợi cho đến khi thấy **"Docker Desktop is running"**

### **macOS:**
- Mở **Docker Desktop** từ Applications
- Đợi biểu tượng Docker trên menu bar không còn animation

### **Linux:**
```bash
sudo systemctl start docker
```

---

## 🚀 **BƯỚC 4: BUILD VÀ KHỞI ĐỘNG DỰ ÁN**

### **Lệnh quan trọng nhất:**

```bash
docker-compose up -d --build
```

**Giải thích:**
- `docker-compose up`: Khởi động tất cả services
- `-d`: Chạy ở background (detached mode)
- `--build`: Build Docker images từ Dockerfiles

**⏳ Lần đầu tiên sẽ mất 5-10 phút!**

### **Theo dõi quá trình:**

```bash
# Xem logs real-time
docker-compose logs -f

# Nhấn Ctrl+C để thoát (services vẫn chạy)
```

---

## ⏳ **BƯỚC 5: ĐỢI SERVICES SẴN SÀNG**

### **Kiểm tra tất cả containers đang chạy:**

```bash
docker-compose ps
```

**Kết quả mong đợi (STATUS = "Up"):**
```
NAME                  STATUS
frontend              Up
inventory-service     Up
postgres-product      Up
postgres-user         Up
product-service       Up
user-service          Up
```

### **Xem logs để confirm services đã sẵn sàng:**

```bash
# Product Service (Django)
docker-compose logs product-service | grep "StatReloader"
# ✅ Should see: "Watching for file changes with StatReloader"

# Inventory Service (Flask)
docker-compose logs inventory-service | grep "Running on"
# ✅ Should see: "Running on http://0.0.0.0:5000"

# User Service (Spring Boot)
docker-compose logs user-service | grep "Started"
# ✅ Should see: "Started UserServiceApplication"

# Frontend (React)
docker-compose logs frontend | grep "compiled"
# ✅ Should see: "webpack 5.x.x compiled successfully"
```

---

## 🗄️ **BƯỚC 6: SETUP DATABASE**

### **Run Django migrations:**

```bash
docker-compose exec product-service python manage.py migrate
```

**Kết quả:**
```
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying products.0001_initial... OK
  ...
```

---

## 👤 **BƯỚC 7: TẠO ADMIN ACCOUNT**

### **Tạo Django superuser:**

```bash
docker-compose exec product-service python create_superuser.py
```

**Kết quả:**
```
✅ Superuser 'admin' created successfully!
🌐 Access admin panel at: http://localhost:8082/admin/
   Username: admin
   Password: admin123
```

---

## 🌱 **BƯỚC 8: LOAD DỮ LIỆU MẪU (TÙY CHỌN)**

```bash
# Seed database với sample products
python seed_data.py
```

**Lưu ý:** Script này chạy **NGOÀI container** (trên máy host của bạn)

---

## 🌐 **BƯỚC 9: TRUY CẬP ỨNG DỤNG**

### **Mở trình duyệt và test các URLs:**

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| **Frontend (React)** | http://localhost:3000 | - | - |
| **Django Admin** | http://localhost:8082/admin/ | admin | admin123 |
| **Product API** | http://localhost:8082/api/products/ | - | - |
| **User API** | http://localhost:8081/api/users | - | - |
| **Inventory API** | http://localhost:8083/health | - | - |

### **Test APIs bằng curl:**

```bash
# Test Product API
curl http://localhost:8082/api/products/

# Test Inventory API
curl http://localhost:8083/health

# Test User API
curl http://localhost:8081/api/users
```

---

## ✅ **XÁC NHẬN HỆ THỐNG HOẠT ĐỘNG**

### **Checklist:**

- [ ] Tất cả 6 containers đang chạy (`docker-compose ps`)
- [ ] Frontend mở được tại http://localhost:3000
- [ ] Django Admin đăng nhập được với admin/admin123
- [ ] Product API trả về JSON data
- [ ] Không có error trong logs (`docker-compose logs`)

---

## 🛑 **QUẢN LÝ HỆ THỐNG**

### **Dừng tất cả services:**

```bash
docker-compose down
```

### **Khởi động lại:**

```bash
docker-compose up -d
```

### **Restart một service cụ thể:**

```bash
docker-compose restart product-service
```

### **Xem logs của một service:**

```bash
docker-compose logs -f product-service
```

### **Xóa tất cả (bao gồm database):**

```bash
docker-compose down -v
```

⚠️ **Cảnh báo:** Lệnh này sẽ **XÓA TOÀN BỘ DỮ LIỆU**!

---

## 💻 **PHÁT TRIỂN VÀ SỬA CODE**

### **⚡ Auto-Reload đã được cấu hình sẵn!**

**Bạn KHÔNG CẦN restart Docker khi sửa code!**

**Workflow:**
1. Mở file code trong editor (VS Code, PyCharm, etc.)
2. Sửa code (ví dụ: `product-service/products/views.py`)
3. Save file (Ctrl+S)
4. Đợi 3-5 giây
5. Refresh browser → Thay đổi đã có hiệu lực! 🎉

**Xem logs để confirm auto-reload hoạt động:**
```bash
docker-compose logs -f product-service
```

**Khi bạn save file, sẽ thấy:**
```
/app/products/views.py changed, reloading.
```

### **Khi nào CẦN restart:**

| Thay Đổi | Lệnh | Lý Do |
|----------|------|-------|
| Sửa `.py`, `.js`, `.html` | ❌ Không cần | Auto-reload hoạt động |
| Thêm package vào `requirements.txt` | `docker-compose restart product-service` | Cần cài package mới |
| Thêm package vào `package.json` | `docker-compose restart frontend` | Cần cài npm package |
| Sửa `Dockerfile` | `docker-compose up -d --build` | Cần rebuild image |
| Sửa `docker-compose.yml` | `docker-compose up -d` | Apply config mới |

---

## 🔧 **XỬ LÝ LỖI THƯỜNG GẶP**

### **Lỗi 1: Port đã được sử dụng**

**Thông báo lỗi:**
```
Error: bind: address already in use
```

**Giải pháp Windows:**
```powershell
# Tìm process đang dùng port (ví dụ port 3000)
netstat -ano | findstr :3000

# Kill process (thay <PID> bằng số PID tìm được)
taskkill /PID <PID> /F
```

**Giải pháp macOS/Linux:**
```bash
# Tìm và kill process đang dùng port 3000
lsof -ti:3000 | xargs kill -9
```

### **Lỗi 2: Docker not running**

**Thông báo lỗi:**
```
Cannot connect to the Docker daemon
```

**Giải pháp:**
1. Mở **Docker Desktop**
2. Đợi cho đến khi Docker khởi động xong
3. Chạy lại `docker-compose up -d`

### **Lỗi 3: Container keeps restarting**

**Giải pháp:**
```bash
# Xem logs để tìm lỗi
docker-compose logs <service_name>

# Ví dụ:
docker-compose logs product-service
```

### **Lỗi 4: Database connection failed**

**Giải pháp:**
```bash
# Reset database hoàn toàn
docker-compose down -v
docker-compose up -d
sleep 30  # Đợi database khởi động
docker-compose exec product-service python manage.py migrate
```

### **Lỗi 5: Frontend blank page**

**Giải pháp:**
```bash
# Rebuild frontend
docker-compose up -d --build frontend

# Xem logs
docker-compose logs frontend

# Clear browser cache và reload (Ctrl+Shift+R)
```

### **Lỗi 6: Permission denied (Linux/macOS)**

**Giải pháp:**
```bash
# Add user vào docker group
sudo usermod -aG docker $USER

# Logout và login lại
# Hoặc chạy lệnh với sudo:
sudo docker-compose up -d
```

---

## 📚 **TÀI LIỆU THAM KHẢO**

| File | Mô Tả |
|------|-------|
| **README.md** | Tổng quan dự án và kiến trúc |
| **INSTALLATION_GUIDE.md** | Hướng dẫn chi tiết (file bạn đang đọc) |
| **SSRF_EXPLOIT_GUIDE.md** | Hướng dẫn khai thác lỗ hổng SSRF |
| **PENTEST_TOOLKIT_INFO.md** | Toolkit cho penetration testing |
| **DOCKER_AUTO_RELOAD.md** | Chi tiết về cơ chế auto-reload |
| **DOCKER_AUTO_RELOAD_QUICK_REF.md** | Quick reference 1 trang |
| **AUTO_RELOAD_DIAGRAM.md** | Sơ đồ workflow |

---

## 🎓 **HƯỚNG DẪN HỌC TẬP**

### **1. Khám phá lỗ hổng SSRF:**

Đọc file **SSRF_EXPLOIT_GUIDE.md** để hiểu:
- Lỗ hổng SSRF nằm ở đâu (inventory-service)
- Cách khai thác lỗ hổng
- Cách phòng chống

### **2. Sử dụng Pentesting Toolkit:**

Đọc file **PENTEST_TOOLKIT_INFO.md** để:
- Dùng Black Box testing tools
- Dùng Gray Box testing tools
- Dùng White Box analysis tools

### **3. Thực hành phát triển:**

- Sửa code trong `product-service/products/views.py`
- Thêm API endpoint mới
- Test auto-reload mechanism
- Thử nghiệm với Django Admin

---

## 🔒 **LƯU Ý BẢO MẬT**

⚠️ **DỰ ÁN NÀY CÓ LỖ HỔNG CỐ TÌNH CHO MỤC ĐÍCH HỌC TẬP!**

**KHÔNG được:**
- ❌ Deploy lên production/server công cộng
- ❌ Sử dụng cho hệ thống thật
- ❌ Để exposed trên Internet

**CHỈ dùng cho:**
- ✅ Học tập và nghiên cứu
- ✅ Thực hành penetration testing
- ✅ Hiểu về security vulnerabilities
- ✅ Chạy local trên máy cá nhân

---

## 📞 **HỖ TRỢ**

### **Gặp vấn đề?**

1. **Đọc phần [Troubleshooting](#-x-l-li-thng-gp)** ở trên
2. **Xem logs:** `docker-compose logs -f`
3. **Kiểm tra Docker Desktop** có đủ resources (RAM, CPU)
4. **Mở GitHub Issue:** https://github.com/WuangTX/Microservice-test-SSRF/issues

### **Cần thêm hướng dẫn?**

- Đọc các file `.md` khác trong repository
- Xem code comments trong source files
- Check Docker Compose logs để debug

---

## ✅ **CHECKLIST HOÀN THÀNH**

- [ ] Docker Desktop đã cài đặt và đang chạy
- [ ] Repository đã clone về máy
- [ ] `docker-compose up -d --build` chạy thành công
- [ ] Tất cả 6 containers đang chạy
- [ ] Django migrations đã chạy
- [ ] Admin account đã tạo (admin/admin123)
- [ ] Frontend mở được tại http://localhost:3000
- [ ] Django Admin đăng nhập được
- [ ] APIs test thành công với curl

---

## 🎉 **CHÚC MỪNG!**

Bạn đã setup thành công dự án! 🚀

**Bây giờ bạn có thể:**
- ✅ Phát triển và sửa code (auto-reload sẽ giúp bạn)
- ✅ Học về microservice architecture
- ✅ Thực hành penetration testing với SSRF
- ✅ Quản lý products qua Django Admin
- ✅ Khám phá các security vulnerabilities

**Happy Coding & Happy Hacking! 🔐**

---

**Tác giả:** WuangTX  
**Repository:** https://github.com/WuangTX/Microservice-test-SSRF  
**Date:** October 2025
