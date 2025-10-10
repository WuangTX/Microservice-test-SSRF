# 📝 **QUICK REFERENCE - DOCKER AUTO-RELOAD**

## **Câu Hỏi: Làm sao Docker biết file thay đổi?**

### **Trả Lời Ngắn Gọn:**

```
Docker dùng VOLUME MOUNTING để "mirror" files từ Windows vào container.
Khi bạn edit file trên Windows → File trong container cũng thay đổi ngay lập tức!
Django/Flask/React có FILE WATCHER để detect changes và tự động reload.
```

---

## **⚡ QUICK FACTS**

| Item | Value |
|------|-------|
| **Mechanism** | Volume Mounting + File Watcher |
| **Speed** | 3-5 seconds (vs 75-135s without) |
| **Restart Needed?** | ❌ NO (for code changes) |
| **Works For** | Python (.py), JavaScript (.js), HTML |

---

## **🔄 WORKFLOW**

```
1. Edit file      (VS Code)
2. Save          (Ctrl+S)
3. Auto-reload   (3-5 seconds)
4. Refresh       (Browser)
5. Done! 🎉
```

---

## **⚙️ CONFIGURATION**

```yaml
# docker-compose.yml
services:
  product-service:
    volumes:
      - ./product-service:/app  # ← Magic happens here!
      - /app/__pycache__         # ← Exclude cache
```

---

## **✅ VERIFY WORKING**

```powershell
# Watch logs
docker-compose logs -f product-service

# Edit file (add comment)
# products/admin.py: # Test

# Check logs for:
"/app/products/admin.py changed, reloading."
# ↑ If you see this → ✅ Working!
```

---

## **❌ WHEN TO RESTART**

| Change | Restart? |
|--------|----------|
| Edit `.py` file | ❌ NO |
| Edit `.js` file | ❌ NO |
| Edit `requirements.txt` | ✅ YES |
| Edit `Dockerfile` | ✅ YES |
| Edit `docker-compose.yml` | ✅ YES |

---

## **🚀 ENABLE AUTO-RELOAD**

```powershell
# Run this script (already done!)
powershell -ExecutionPolicy Bypass -File enable_auto_reload.ps1
```

---

## **📖 FULL DOCS**

- [`DOCKER_AUTO_RELOAD.md`](DOCKER_AUTO_RELOAD.md ) - Complete guide
- [`AUTO_RELOAD_DIAGRAM.md`](AUTO_RELOAD_DIAGRAM.md ) - Visual diagrams
- [`DOCKER_AUTO_RELOAD_SUMMARY.md`](DOCKER_AUTO_RELOAD_SUMMARY.md ) - Summary

---

## **💡 KEY INSIGHT**

```
Volume Mounting = File Sharing
File Watcher = Auto Detect
Auto-Reload = Process Restart

Together = Fast Development! 🚀
```
