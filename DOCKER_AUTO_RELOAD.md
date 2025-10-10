# 🔄 **DOCKER AUTO-RELOAD MECHANISM**

## **Làm Sao Docker Biết File Thay Đổi?**

---

## **1️⃣ VOLUME MOUNTING - CHIA SẺ FILE SYSTEM**

### **Concept:**

```
┌─────────────────────────────────────────────────────────────┐
│                    VOLUME MOUNTING                           │
└─────────────────────────────────────────────────────────────┘

[HOST - Windows/Mac]                [DOCKER CONTAINER]
C:\Users\...\microservice_lab\      /app/
├─ product-service/                 ├─ manage.py
│  ├─ manage.py                     ├─ products/
│  ├─ products/                     │  ├─ admin.py
│  │  ├─ admin.py         ←────────────┘  ├─ views.py
│  │  ├─ views.py         MOUNT         └─ models.py
│  │  └─ models.py                  └─ ...
│  └─ ...
└─ ...

Khi bạn edit file trên HOST → File trong CONTAINER cũng thay đổi ngay lập tức!
```

---

## **2️⃣ DOCKER-COMPOSE VOLUMES CONFIGURATION**

### **Product Service (Django):**

```yaml
product-service:
  volumes:
    # Mount toàn bộ source code
    - ./product-service:/app
    
    # Giải thích:
    # ./product-service       → Folder trên HOST (Windows)
    # /app                    → Folder trong CONTAINER
    # 
    # Mọi file trong ./product-service sẽ được "map" vào /app
    # Khi edit file trên Windows → File trong container thay đổi
    
    # Exclude cache folders (performance optimization)
    - /app/__pycache__
    - /app/*/__pycache__
```

### **Inventory Service (Flask):**

```yaml
inventory-service:
  volumes:
    - ./inventory-service:/app
    - /app/__pycache__
```

### **Frontend (React):**

```yaml
frontend:
  volumes:
    - ./frontend/src:/app/src
    - ./frontend/public:/app/public
    - /app/node_modules  # Exclude node_modules!
```

---

## **3️⃣ AUTO-RELOAD MECHANISM**

### **Django (Product Service):**

```python
# Django Development Server có built-in auto-reload
# File: manage.py

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'product_service.settings')
    
    # StatReloader sẽ watch file changes
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
```

**Flow:**

```
1. Bạn edit admin.py trên Windows
   ↓
2. Volume mount sync file vào container ngay lập tức
   ↓
3. Django's StatReloader phát hiện file thay đổi
   ↓
4. Django tự động reload process
   ↓
5. Changes được apply!

Logs:
Watching for file changes with StatReloader
/app/products/admin.py changed, reloading.
Performing system checks...
Starting development server at http://0.0.0.0:8082/
```

---

### **Flask (Inventory Service):**

```python
# Flask Debug Mode có auto-reload
# File: app.py

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=8083,
        debug=True  # ← Enable auto-reload!
    )
```

**Flow:**

```
1. Edit app.py trên Windows
   ↓
2. Volume mount sync
   ↓
3. Flask Werkzeug Reloader phát hiện changes
   ↓
4. Flask restart process
   ↓
5. Changes applied!

Logs:
 * Detected change in '/app/app.py', reloading
 * Restarting with stat
```

---

### **React (Frontend):**

```javascript
// React Dev Server (webpack-dev-server) có HMR
// Hot Module Replacement

// File: package.json
{
  "scripts": {
    "start": "react-scripts start"
  }
}
```

**Flow:**

```
1. Edit App.js trên Windows
   ↓
2. Volume mount sync
   ↓
3. webpack-dev-server phát hiện changes
   ↓
4. Webpack rebuild module
   ↓
5. Browser auto-refresh (Hot Module Replacement)

Logs:
Compiling...
Compiled successfully!
webpack 5.88.2 compiled successfully in 1234 ms
```

---

## **4️⃣ FILE WATCHING TECHNOLOGIES**

### **Django - StatReloader:**

```python
# Django sử dụng:
# - watchman (nếu có)
# - inotify (Linux)
# - kqueue (BSD/macOS)
# - polling (Windows - fallback)

# Trong container Linux, dùng inotify:
import sys
from pathlib import Path

def watch_files():
    """Django's file watcher"""
    for filepath in get_python_files():
        # Check file modification time
        stat = filepath.stat()
        if stat.st_mtime > last_check_time:
            print(f"{filepath} changed, reloading.")
            reload_process()
```

---

### **Flask - Werkzeug Reloader:**

```python
# Flask sử dụng Werkzeug Reloader
# Watchdog library (nếu có) hoặc polling

from werkzeug.serving import run_with_reloader

@run_with_reloader
def run_server():
    app.run(host='0.0.0.0', port=8083)
```

---

### **React - webpack-dev-server:**

```javascript
// webpack-dev-server uses chokidar
// Fast file watching library

const chokidar = require('chokidar');

const watcher = chokidar.watch('src/**/*.js', {
  ignored: /node_modules/,
  persistent: true
});

watcher.on('change', path => {
  console.log(`File ${path} has been changed`);
  rebuildBundle();
  sendHMRUpdate();
});
```

---

## **5️⃣ PERFORMANCE CONSIDERATIONS**

### **Why Exclude node_modules and __pycache__?**

```yaml
volumes:
  - ./product-service:/app
  - /app/__pycache__        # ← Exclude!
  - /app/node_modules       # ← Exclude!
```

**Reasons:**

```
1. PERFORMANCE:
   - node_modules có hàng nghìn files
   - Watching tất cả files này làm chậm system
   - __pycache__ thay đổi liên tục, trigger unnecessary reloads

2. COMPATIBILITY:
   - node_modules compiled cho Linux (container)
   - Host có thể là Windows/Mac → Incompatible binaries
   
3. SIZE:
   - node_modules rất lớn (100-500MB+)
   - Sync qua volume mount tốn thời gian

4. SOLUTION:
   - Mount volume nhưng exclude dependencies
   - Container dùng own node_modules/cache
   - Host chỉ sync source code
```

---

## **6️⃣ TESTING AUTO-RELOAD**

### **Test Django Auto-Reload:**

```powershell
# Terminal 1: Watch logs
docker-compose logs -f product-service

# Terminal 2: Edit file
code product-service/products/admin.py
# Make a change and save (Ctrl+S)

# Terminal 1 output:
# Watching for file changes with StatReloader
# /app/products/admin.py changed, reloading.
# Performing system checks...
# 
# System check identified no issues (0 silenced).
# Starting development server at http://0.0.0.0:8082/
# Quit the server with CONTROL-C.

# ✅ Auto-reload worked!
```

---

### **Test Flask Auto-Reload:**

```powershell
# Terminal 1: Watch logs
docker-compose logs -f inventory-service

# Terminal 2: Edit file
code inventory-service/app.py
# Make a change and save

# Terminal 1 output:
#  * Detected change in '/app/app.py', reloading
#  * Restarting with stat
#  * Debugger is active!
#  * Running on http://0.0.0.0:8083

# ✅ Auto-reload worked!
```

---

### **Test React HMR:**

```powershell
# Terminal 1: Watch logs
docker-compose logs -f frontend

# Terminal 2: Edit file
code frontend/src/App.js
# Make a change and save

# Terminal 1 output:
# Compiling...
# Compiled successfully!
# webpack 5.88.2 compiled successfully in 856 ms

# Browser: Auto-refreshed with new changes!
# ✅ Hot Module Replacement worked!
```

---

## **7️⃣ APPLY CHANGES - RESTART WITH VOLUMES**

### **Restart Services to Apply Volume Mounts:**

```powershell
# Stop all services
docker-compose down

# Start with new volume configuration
docker-compose up -d

# Verify volumes are mounted
docker-compose exec product-service ls -la /app
# Should see your source files!

# Check if auto-reload is working
docker-compose logs -f product-service
# Should see: "Watching for file changes with StatReloader"
```

---

## **8️⃣ VERIFICATION CHECKLIST**

### **✅ Volume Mount Working:**

```powershell
# Test 1: Check file exists in container
docker-compose exec product-service cat /app/products/admin.py

# Test 2: Edit file on host
code product-service/products/admin.py
# Add comment: # TEST VOLUME MOUNT

# Test 3: Check if change appears in container
docker-compose exec product-service cat /app/products/admin.py | grep "TEST VOLUME MOUNT"

# If you see the comment → ✅ Volume mount working!
```

---

### **✅ Auto-Reload Working:**

```powershell
# Test 1: Watch logs
docker-compose logs -f product-service

# Test 2: Edit file (add comment)
# products/admin.py: # This triggers reload

# Test 3: Check logs for reload message
# Should see: "admin.py changed, reloading."

# If you see reload message → ✅ Auto-reload working!
```

---

## **9️⃣ TROUBLESHOOTING**

### **Problem: Changes Not Detected**

```powershell
# Solution 1: Verify volume mount
docker-compose exec product-service ls -la /app/products/

# Solution 2: Check if debug mode enabled
docker-compose exec product-service python -c "from product_service import settings; print(settings.DEBUG)"

# Should print: True

# Solution 3: Restart with volumes
docker-compose down
docker-compose up -d

# Solution 4: Check logs for errors
docker-compose logs product-service | grep -i "error\|warning"
```

---

### **Problem: Slow Performance**

```yaml
# Solution: Add more excludes
volumes:
  - ./product-service:/app
  - /app/__pycache__
  - /app/*/__pycache__
  - /app/.pytest_cache
  - /app/staticfiles
  - /app/media
```

---

## **🔟 SUMMARY**

### **Cơ Chế Auto-Reload:**

```
1. VOLUME MOUNTING:
   ✅ Host folder → Container folder
   ✅ Real-time file sync
   ✅ Bidirectional (changes in container also appear on host)

2. FILE WATCHING:
   ✅ Django: StatReloader (inotify)
   ✅ Flask: Werkzeug Reloader (watchdog/polling)
   ✅ React: webpack-dev-server (chokidar)

3. AUTO-RELOAD:
   ✅ Detect file change
   ✅ Reload process
   ✅ Apply changes
   ✅ No manual restart needed!

4. DEVELOPMENT WORKFLOW:
   1. Edit file trong VS Code (Windows)
   2. Save (Ctrl+S)
   3. Volume mount sync vào container (instant)
   4. File watcher phát hiện thay đổi
   5. Process tự động reload
   6. Refresh browser
   7. ✅ See changes!
```

---

### **Key Takeaways:**

```
✅ Volume mounting = File sharing giữa host và container
✅ Auto-reload = Framework tự detect changes và restart
✅ KHÔNG CẦN rebuild image cho code changes
✅ CHỈ CẦN restart container nếu thay đổi dependencies
```

---

## **📚 REFERENCES**

- Django StatReloader: https://docs.djangoproject.com/en/4.2/ref/django-admin/#runserver
- Flask Werkzeug: https://werkzeug.palletsprojects.com/
- webpack-dev-server: https://webpack.js.org/configuration/dev-server/
- Docker Volumes: https://docs.docker.com/storage/volumes/
