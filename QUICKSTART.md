# 🚀 **QUICK START - CHO NGƯỜI MỚI CLONE DỰ ÁN**

## **3 BƯỚC ĐƠN GIẢN ĐỂ CHẠY DỰ ÁN:**

### **1️⃣ CLONE REPOSITORY**
```bash
git clone https://github.com/WuangTX/Microservice-test-SSRF.git
cd Microservice-test-SSRF
```

### **2️⃣ KHỞI ĐỘNG DOCKER**
```bash
docker-compose up -d --build
```
⏳ **Đợi 5-10 phút lần đầu tiên**

### **3️⃣ SETUP DATABASE & ADMIN**
```bash
# Run migrations
docker-compose exec product-service python manage.py migrate

# Tạo admin account
docker-compose exec product-service python create_superuser.py
```

---

## **✅ XEM KẾT QUẢ:**

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Django Admin** | http://localhost:8082/admin/ (admin/admin123) |
| **Product API** | http://localhost:8082/api/products/ |
| **User API** | http://localhost:8081/api/users |
| **Inventory API** | http://localhost:8083/health |

---

## **📚 ĐỌC HƯỚNG DẪN CHI TIẾT:**

➡️ **[SETUP_FOR_NEW_USERS.md](SETUP_FOR_NEW_USERS.md)** - Hướng dẫn đầy đủ cho người mới

---

## **💡 LƯU Ý QUAN TRỌNG:**

### **YÊU CẦU:**
- ✅ Docker Desktop phải đang chạy
- ✅ Ports 3000, 8081, 8082, 8083, 5433, 5434 phải trống

### **AUTO-RELOAD:**
- ✅ Sửa code → Ctrl+S → Đợi 3-5 giây → Refresh browser
- ✅ **KHÔNG CẦN restart Docker!**

### **KHI NÀO CẦN RESTART:**
- ❌ Sửa `.py`, `.js`, `.html` → Không cần restart
- ✅ Thêm package vào `requirements.txt` → `docker-compose restart product-service`
- ✅ Thêm package vào `package.json` → `docker-compose restart frontend`
- ✅ Sửa `Dockerfile` → `docker-compose up -d --build`

---

## **🔧 TROUBLESHOOTING:**

### **Port đã được sử dụng?**
```powershell
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### **Container không chạy?**
```bash
# Xem logs
docker-compose logs -f

# Reset toàn bộ
docker-compose down -v
docker-compose up -d --build
```

---

## **📞 CẦN HELP?**

1. Đọc **[SETUP_FOR_NEW_USERS.md](SETUP_FOR_NEW_USERS.md)**
2. Xem logs: `docker-compose logs -f`
3. Mở issue: https://github.com/WuangTX/Microservice-test-SSRF/issues

---

**Happy Coding! 🎉**
