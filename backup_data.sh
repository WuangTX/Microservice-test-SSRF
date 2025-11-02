#!/bin/bash

# Script backup dữ liệu trước khi thay đổi IP hoặc restart VM

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "=============================================="
echo "  Backup Microservice Data"
echo "=============================================="
echo ""

# Tạo thư mục backup
mkdir -p $BACKUP_DIR

echo "📦 Bắt đầu backup..."
echo ""

# 1. Backup PostgreSQL User Service
echo "1. Backup User Service Database..."
docker exec postgres-user pg_dump -U userservice userservice_db > $BACKUP_DIR/userservice_db_$DATE.sql
if [ $? -eq 0 ]; then
    echo "   ✓ Saved: $BACKUP_DIR/userservice_db_$DATE.sql"
else
    echo "   ✗ Failed to backup user service"
fi

# 2. Backup PostgreSQL Product Service
echo "2. Backup Product Service Database..."
docker exec postgres-product pg_dump -U productservice productservice_db > $BACKUP_DIR/productservice_db_$DATE.sql
if [ $? -eq 0 ]; then
    echo "   ✓ Saved: $BACKUP_DIR/productservice_db_$DATE.sql"
else
    echo "   ✗ Failed to backup product service"
fi

# 3. Backup Docker Volumes
echo "3. Backup Docker Volumes..."
docker run --rm -v microservice-test-ssrf_postgres_user_data:/data -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/volume_user_$DATE.tar.gz -C /data .
if [ $? -eq 0 ]; then
    echo "   ✓ Saved: $BACKUP_DIR/volume_user_$DATE.tar.gz"
fi

docker run --rm -v microservice-test-ssrf_postgres_product_data:/data -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/volume_product_$DATE.tar.gz -C /data .
if [ $? -eq 0 ]; then
    echo "   ✓ Saved: $BACKUP_DIR/volume_product_$DATE.tar.gz"
fi

# 4. Backup nginx config
echo "4. Backup nginx config..."
cp /home/ubuntu/Microservice-test-SSRF/nginx-proxy-local.conf $BACKUP_DIR/nginx-proxy-local_$DATE.conf
echo "   ✓ Saved: $BACKUP_DIR/nginx-proxy-local_$DATE.conf"

# 5. List backups
echo ""
echo "=============================================="
echo "  Backup hoàn tất!"
echo "=============================================="
echo ""
echo "📁 Vị trí backup: $BACKUP_DIR"
echo ""
echo "Các file backup:"
ls -lh $BACKUP_DIR/*$DATE* | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "=============================================="
echo "  Hướng dẫn restore:"
echo "=============================================="
echo ""
echo "Restore User DB:"
echo "  cat $BACKUP_DIR/userservice_db_$DATE.sql | docker exec -i postgres-user psql -U userservice -d userservice_db"
echo ""
echo "Restore Product DB:"
echo "  cat $BACKUP_DIR/productservice_db_$DATE.sql | docker exec -i postgres-product psql -U productservice -d productservice_db"
echo ""
echo "Restore Volumes:"
echo "  docker run --rm -v microservice-test-ssrf_postgres_user_data:/data -v $BACKUP_DIR:/backup alpine tar xzf /backup/volume_user_$DATE.tar.gz -C /data"
echo ""

# Cleanup old backups (giữ 5 backup gần nhất)
echo "🧹 Dọn dẹp backup cũ (giữ 5 backup gần nhất)..."
cd $BACKUP_DIR
ls -t userservice_db_*.sql | tail -n +6 | xargs -r rm
ls -t productservice_db_*.sql | tail -n +6 | xargs -r rm
ls -t volume_*.tar.gz | tail -n +6 | xargs -r rm
ls -t nginx-proxy-local_*.conf | tail -n +6 | xargs -r rm

echo "✓ Hoàn tất!"
