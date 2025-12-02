# HƯỚNG DẪN CẤU HÌNH LẠI NGINX - BỎ NGINX-PROXY CONTAINER

## 📝 Thay đổi:
- ✅ Bỏ nginx-proxy container (thừa)
- ✅ Frontend expose port 3000
- ✅ Nginx chính của server handle tất cả (SSL + proxy API)

---

## 🚀 BƯỚC 1: Copy files từ máy local

```powershell
# Từ máy Windows, chạy:
scp -P 24700 "C:\Users\ASUS-PRO\Desktop\Microservice_lab_2\Microservice-test-SSRF\docker-compose.yml" quang@103.56.163.193:~/microservice-shop/docker-compose.prod.yml

scp -P 24700 "C:\Users\ASUS-PRO\Desktop\Microservice_lab_2\Microservice-test-SSRF\nginx-server-config.conf" quang@103.56.163.193:~/nginx-quangtx.conf
```

---

## 🔧 BƯỚC 2: Trên server, cấu hình nginx

```bash
# SSH vào server
ssh quang@103.56.163.193 -p 24700

# Backup config cũ
sudo cp /etc/nginx/sites-available/quangtx.io.vn /etc/nginx/sites-available/quangtx.io.vn.backup

# Copy config mới
sudo cp ~/nginx-quangtx.conf /etc/nginx/sites-available/quangtx.io.vn

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🐳 BƯỚC 3: Restart Docker containers

```bash
cd ~/microservice-shop

# Stop containers cũ
docker-compose -f docker-compose.prod.yml down

# Start lại (không có nginx-proxy nữa)
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker ps
```

---

## ✅ BƯỚC 4: Kiểm tra

```bash
# Test frontend (qua nginx chính)
curl -I https://quangtx.io.vn

# Test API
curl https://quangtx.io.vn/api/products/

# Test order service
curl https://quangtx.io.vn/api/orders

# Check logs
docker logs product-service --tail 20
docker logs order-service --tail 20
sudo tail -f /var/log/nginx/quangtx.io.vn.access.log
```

---

## 📊 Kiến trúc mới:

```
Internet (HTTPS)
       ↓
Nginx chính (port 443) - quangtx.io.vn
       ↓
       ├─► / → frontend:3000 (React static files)
       ├─► /api/auth → user-service:8081
       ├─► /api/users → user-service:8081
       ├─► /api/products → product-service:8082
       ├─► /api/shipping → product-service:8082
       ├─► /api/warranty → product-service:8082
       ├─► /api/inventory → inventory-service:8083
       └─► /api/orders → order-service:8084
```

**Lợi ích:**
- ✅ Đơn giản hơn (bỏ 1 nginx thừa)
- ✅ SSL được handle bởi nginx chính
- ✅ Dễ debug và monitor hơn
- ✅ Performance tốt hơn (ít layer hơn)
