# Hướng Dẫn Quản Lý IP Động cho VMware Ubuntu

## 📌 Vấn đề
- Ubuntu chạy trong VMware với Bridge Network
- IP thay đổi liên tục
- Cần giữ dữ liệu khi IP thay đổi

## ✅ Giải pháp
- Dữ liệu lưu trong **Docker Volumes** (persistent)
- Chỉ cần **update DNS A Record** khi IP đổi
- Không mất dữ liệu, không cần cấu hình lại

---

## 📂 Cấu trúc Dữ liệu

### Docker Volumes (tự động tạo):
```
microservice-test-ssrf_postgres_user_data      → User database
microservice-test-ssrf_postgres_product_data   → Product database
```

### Thư mục Backup:
```
/home/ubuntu/backups/
├── userservice_db_YYYYMMDD_HHMMSS.sql
├── productservice_db_YYYYMMDD_HHMMSS.sql
├── volume_user_YYYYMMDD_HHMMSS.tar.gz
└── volume_product_YYYYMMDD_HHMMSS.tar.gz
```

---

## 🔧 Scripts Quản Lý

### 1. **update_ip.sh** - Kiểm tra IP hiện tại
```bash
./update_ip.sh
```
**Chức năng:**
- Hiển thị IP hiện tại của Ubuntu
- Kiểm tra DNS record hiện tại
- Hướng dẫn update DNS
- Kiểm tra Docker services và volumes

---

### 2. **backup_data.sh** - Backup toàn bộ dữ liệu
```bash
./backup_data.sh
```
**Chức năng:**
- Backup PostgreSQL databases (SQL dump)
- Backup Docker volumes (tar.gz)
- Backup nginx config
- Auto cleanup (giữ 5 backup gần nhất)

**Khi nào cần backup:**
- Trước khi tắt VM
- Trước khi update hệ thống
- Định kỳ hàng tuần

---

### 3. **restart_with_new_ip.sh** - Khởi động lại với IP mới
```bash
./restart_with_new_ip.sh
```
**Chức năng:**
- Stop Docker services
- Update configs nếu cần
- Start lại services
- Giữ nguyên dữ liệu trong volumes
- Test các services

---

## 📋 Quy trình khi IP thay đổi

### Bước 1: Kiểm tra IP mới
```bash
./update_ip.sh
```
Ghi lại IP mới (VD: 172.20.10.5)

### Bước 2: Backup dữ liệu (khuyến nghị)
```bash
./backup_data.sh
```

### Bước 3: Update DNS Record

**Truy cập nhà cung cấp domain:**
- GoDaddy: DNS Management
- Namecheap: Advanced DNS
- Cloudflare: DNS Records
- etc.

**Cập nhật A Record:**
```
Type: A
Host: @ (hoặc quangtx.io.vn)
Value: [IP MỚI]
TTL: 300 (5 phút)
```

**Ví dụ:**
```
Before: quangtx.io.vn → 172.20.10.2
After:  quangtx.io.vn → 172.20.10.5
```

### Bước 4: Đợi DNS Propagate
```bash
# Kiểm tra DNS mỗi 1 phút
watch -n 60 "dig quangtx.io.vn +short"
```
Thường mất 2-15 phút

### Bước 5: Kiểm tra
```bash
# Kiểm tra DNS
dig quangtx.io.vn

# Test website
curl -I http://quangtx.io.vn

# Test login
curl -X POST http://quangtx.io.vn/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 🔄 Khôi phục Dữ liệu

### Từ SQL Backup:
```bash
# Restore User DB
cat /home/ubuntu/backups/userservice_db_YYYYMMDD_HHMMSS.sql | \
  docker exec -i postgres-user psql -U userservice -d userservice_db

# Restore Product DB
cat /home/ubuntu/backups/productservice_db_YYYYMMDD_HHMMSS.sql | \
  docker exec -i postgres-product psql -U productservice -d productservice_db
```

### Từ Volume Backup:
```bash
# Restore User Volume
docker run --rm \
  -v microservice-test-ssrf_postgres_user_data:/data \
  -v /home/ubuntu/backups:/backup \
  alpine tar xzf /backup/volume_user_YYYYMMDD_HHMMSS.tar.gz -C /data

# Restore Product Volume
docker run --rm \
  -v microservice-test-ssrf_postgres_product_data:/data \
  -v /home/ubuntu/backups:/backup \
  alpine tar xzf /backup/volume_product_YYYYMMDD_HHMMSS.tar.gz -C /data
```

---

## 🚀 Quản lý Docker Services

### Xem trạng thái:
```bash
docker ps
docker volume ls
```

### Khởi động:
```bash
cd /home/ubuntu/Microservice-test-SSRF
docker compose up -d
```

### Dừng (giữ dữ liệu):
```bash
docker compose down
```

### Dừng và XÓA dữ liệu (CẢNH BÁO!):
```bash
docker compose down -v  # ⚠️ Xóa volumes!
```

### Xem logs:
```bash
docker logs nginx-proxy --tail 50
docker logs product-service --tail 50
docker logs user-service --tail 50
```

---

## 💡 Tips

### 1. Tự động backup hàng ngày:
```bash
# Thêm vào crontab
crontab -e

# Thêm dòng này (backup lúc 2h sáng mỗi ngày)
0 2 * * * /home/ubuntu/Microservice-test-SSRF/backup_data.sh
```

### 2. Set Static IP trong VMware:
**Nếu muốn IP không đổi:**
- VMware → Edit → Virtual Network Editor
- Chọn VMnet0 (Bridge)
- DHCP Settings → Add Reserved IP

### 3. Sử dụng DDNS (Dynamic DNS):
**Dịch vụ miễn phí:**
- No-IP (noip.com)
- DuckDNS (duckdns.org)
- Dynu (dynu.com)

**Tự động update IP:**
```bash
# Cài đặt ddclient
sudo apt install ddclient

# Hoặc dùng script
# VD với No-IP:
curl "http://username:password@dynupdate.no-ip.com/nic/update?hostname=quangtx.io.vn&myip=$(hostname -I | awk '{print $1}')"
```

---

## 📞 Xử lý sự cố

### DNS chưa update:
```bash
# Clear DNS cache trên Ubuntu
sudo systemd-resolve --flush-caches

# Hoặc dùng DNS public
dig @8.8.8.8 quangtx.io.vn
```

### Services không start:
```bash
# Xem logs
docker compose logs

# Restart specific service
docker restart product-service

# Rebuild nếu cần
docker compose build product-service
docker compose up -d
```

### Mất dữ liệu:
```bash
# Check volumes còn không
docker volume ls | grep microservice

# Restore từ backup
./backup_data.sh  # xem hướng dẫn restore
```

---

## ✅ Checklist

**Trước khi tắt VM:**
- [ ] Chạy `./backup_data.sh`
- [ ] Ghi lại IP hiện tại
- [ ] Stop Docker: `docker compose down`

**Sau khi bật VM:**
- [ ] Chạy `./update_ip.sh` - kiểm tra IP mới
- [ ] Start Docker: `docker compose up -d`
- [ ] Update DNS A Record với IP mới
- [ ] Đợi DNS propagate (5-15 phút)
- [ ] Test: `curl http://quangtx.io.vn`

---

## 📚 Tài liệu liên quan

- [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [DNS A Record Guide](https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/)

---

**Tạo bởi:** Microservice SSRF Lab
**Ngày:** October 2025
**Version:** 1.0
