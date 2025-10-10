# 📊 DOCKER AUTO-RELOAD VISUALIZATION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DOCKER VOLUME MOUNT MECHANISM                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                                                                
   ┌──────────────────────────────┐           ┌──────────────────────────────┐
   │     HOST (Windows/Mac)        │           │     DOCKER CONTAINER         │
   │                               │           │                              │
   │  C:\Users\...\                │           │    /app/                     │
   │  microservice_lab\            │           │                              │
   │                               │           │                              │
   │  ├─ product-service/          │  MOUNT    │  ├─ manage.py                │
   │  │  ├─ manage.py              │◄─────────►│  ├─ products/               │
   │  │  ├─ products/              │  SYNC     │  │  ├─ admin.py             │
   │  │  │  ├─ admin.py ◄──────────┼───────────┼──┼─►│  ├─ views.py          │
   │  │  │  ├─ views.py            │  REAL     │  │  └─ models.py            │
   │  │  │  └─ models.py           │  TIME     │  └─ ...                      │
   │  │  └─ ...                    │           │                              │
   │  │                            │           │                              │
   │  └─ inventory-service/        │  MOUNT    │                              │
   │     ├─ app.py ◄────────────────┼───────────┼─► /app/app.py              │
   │     └─ ...                    │           │                              │
   │                               │           │                              │
   └───────────────────────────────┘           └──────────────────────────────┘
                                                                                
          👨‍💻 DEVELOPER                                  🐳 CONTAINER
        Edit in VS Code                          Sees changes instantly!


┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTO-RELOAD WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  STEP 1: Edit File
  ─────────────────
  
    👨‍💻 Developer                              💻 VS Code
       │                                        │
       │  1. Open admin.py                     │
       │─────────────────────────────────────►│
       │                                        │
       │  2. Make changes                      │
       │     (Add new admin features)          │
       │                                        │
       │  3. Save (Ctrl+S)                     │
       │─────────────────────────────────────►│
       │                                        │
       └────────────────────────────────────────┘
                        │
                        │ File saved to disk
                        ▼

  STEP 2: Volume Sync
  ────────────────────
  
    💾 Windows Disk                       🔄 Docker Volume
       │                                     │
       │  admin.py changed                  │
       │  (timestamp updated)                │
       │                                     │
       │  Docker detects change              │
       │─────────────────────────────────────►
       │                                     │
       │  Sync file to container             │
       │═════════════════════════════════════►
       │  (INSTANT - using inotify)          │
       └─────────────────────────────────────┘
                        │
                        │ File now updated in container
                        ▼

  STEP 3: File Watcher Detects
  ─────────────────────────────
  
    🐳 Container                          🔍 Django StatReloader
       │                                     │
       │  /app/products/admin.py changed    │
       │─────────────────────────────────────►
       │                                     │
       │                                     │ Check file mtime
       │                                     │ (modification time)
       │                                     │
       │                                     ├─ Current: 14:30:45
       │                                     └─ Previous: 14:25:10
       │                                        → FILE CHANGED!
       │                                     │
       │                                     │ Trigger reload
       │◄─────────────────────────────────────┤
       └─────────────────────────────────────┘
                        │
                        │ Reload initiated
                        ▼

  STEP 4: Process Reload
  ───────────────────────
  
    🔄 Django Process                      📋 Reload Steps
       │                                     │
       │  Kill old process                  │  1. Stop current server
       │─────────────────────────────────────►
       │                                     │  2. Clear imported modules
       │                                     │     (sys.modules)
       │                                     │
       │  Start new process                 │  3. Re-import all modules
       │─────────────────────────────────────►    (including admin.py)
       │                                     │
       │  Load updated code                 │  4. Apply migrations (if any)
       │─────────────────────────────────────►
       │                                     │  5. Start server
       │  Server ready!                     │
       │◄─────────────────────────────────────┤
       └─────────────────────────────────────┘
                        │
                        │ New code active
                        ▼

  STEP 5: Browser Refresh
  ────────────────────────
  
    🌐 Browser                            🖥️ Admin Interface
       │                                     │
       │  User refreshes (F5)               │
       │─────────────────────────────────────►
       │                                     │  Render with new
       │                                     │  admin.py code
       │                                     │
       │  New interface displayed!          │
       │◄─────────────────────────────────────┤
       │  (colors, icons, inline editing)   │
       └─────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                     TIME COMPARISON                                          │
└─────────────────────────────────────────────────────────────────────────────┘

  WITHOUT VOLUME MOUNT (Old Way)
  ─────────────────────────────────
  
    Edit code → Save → Stop container → Rebuild image → Start container
       1s        1s       3s              60-120s          10s
       
    TOTAL: ~75-135 seconds per change! 😰
  
  
  WITH VOLUME MOUNT (New Way)
  ───────────────────────────
  
    Edit code → Save → Auto-reload → Refresh browser
       1s        1s      2-3s           1s
       
    TOTAL: ~5 seconds per change! 🚀
    
    SPEEDUP: 15-27x faster! 🎉


┌─────────────────────────────────────────────────────────────────────────────┐
│                     FILE WATCHING TECHNOLOGIES                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Linux (in Docker Container)
  ───────────────────────────
  
    inotify
      │
      ├─ Kernel-level file watching
      ├─ Instant notifications
      ├─ Low CPU usage
      └─ Events: CREATE, MODIFY, DELETE, MOVED_FROM, MOVED_TO
  
  
  Django StatReloader
  ───────────────────
  
    ┌─────────────────────┐
    │  Main Thread        │
    │  (Django Server)    │
    └─────────────────────┘
              │
              ├─ Spawns
              ▼
    ┌─────────────────────┐
    │  Reloader Thread    │
    │                     │
    │  while True:        │
    │    for file in      │
    │      watched_files: │
    │        if changed:  │
    │          reload()   │
    │    sleep(1s)        │
    └─────────────────────┘
  
  
  Flask Werkzeug Reloader
  ───────────────────────
  
    watchdog (if available)
      │
      └─ Observer pattern
         └─ FileSystemEventHandler
            └─ on_modified() → reload
    
    OR
    
    Polling (fallback)
      │
      └─ Check mtimes every 1s


┌─────────────────────────────────────────────────────────────────────────────┐
│                     VOLUME MOUNT CONFIG                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  docker-compose.yml
  ──────────────────
  
    services:
      product-service:
        volumes:
          # Mount entire source code
          - ./product-service:/app
          
          # Exclude cache (performance)
          - /app/__pycache__
          - /app/*/__pycache__
    
    
    Explanation:
    ────────────
    
    ./product-service:/app
     └─ Host path    └─ Container path
     
     Mapping:
     Host                          Container
     ────────────────────────────────────────
     ./product-service/            /app/
     ./product-service/manage.py → /app/manage.py
     ./product-service/products/   /app/products/
     
     
    /app/__pycache__
     └─ Anonymous volume
        (overrides parent mount)
     
     Why?
     ────
     - __pycache__ thay đổi liên tục
     - Không cần sync với host
     - Giảm I/O operations
     - Tăng performance


┌─────────────────────────────────────────────────────────────────────────────┐
│                     TESTING AUTO-RELOAD                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Terminal 1: Watch Logs
  ──────────────────────
  
    PS> docker-compose logs -f product-service
    
    Output:
    ───────
    Watching for file changes with StatReloader
    Performing system checks...
    
    System check identified no issues (0 silenced).
    Starting development server at http://0.0.0.0:8082/
    Quit the server with CONTROL-C.
    
    [Wait for file change...]
    
    /app/products/admin.py changed, reloading.  ← 🎯 FILE DETECTED!
    Performing system checks...
    
    System check identified no issues (0 silenced).
    Starting development server at http://0.0.0.0:8082/
    Quit the server with CONTROL-C.
    
    ✅ Auto-reload successful!
  
  
  Terminal 2: Edit File
  ─────────────────────
  
    PS> code product-service\products\admin.py
    
    # Add comment:
    # This is a test for auto-reload
    
    # Save: Ctrl+S
    
    [Check Terminal 1 for reload message]
    
    ✅ If you see "changed, reloading" → Working!


┌─────────────────────────────────────────────────────────────────────────────┐
│                     PERFORMANCE TIPS                                         │
└─────────────────────────────────────────────────────────────────────────────┘

  DO:
  ───
  ✅ Mount only source code directories
  ✅ Exclude node_modules, __pycache__, .git
  ✅ Use .dockerignore file
  ✅ Keep containers running (don't restart frequently)
  
  
  DON'T:
  ──────
  ❌ Mount entire project (including node_modules)
  ❌ Mount system folders
  ❌ Sync large binary files
  ❌ Watch too many files
  
  
  Optimization Example:
  ─────────────────────
  
    # ❌ Bad - Mounts everything
    volumes:
      - .:/app
    
    # ✅ Good - Selective mounting
    volumes:
      - ./src:/app/src
      - ./public:/app/public
      - /app/node_modules      # Exclude
      - /app/.git              # Exclude
      - /app/__pycache__       # Exclude
```

**SUMMARY:**

- **Volume Mount** = Real-time file sharing
- **File Watcher** = Detect changes (inotify/watchdog)
- **Auto-Reload** = Restart process with new code
- **Result** = Instant updates (5s vs 75-135s)
