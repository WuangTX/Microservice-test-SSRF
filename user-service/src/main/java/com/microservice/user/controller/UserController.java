package com.microservice.user.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.microservice.user.model.User;
import com.microservice.user.service.UserService;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.getUserById(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User user) {
        try {
            return ResponseEntity.ok(userService.updateUser(id, user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // VULNERABLE endpoint - Only accessible from Docker internal network (for SSRF demo)
    // This simulates an internal-only API that should not be exposed to public
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id, HttpServletRequest request) {
        // Get client IP address
        String clientIp = getClientIp(request);
        
        System.out.println("🔍 Delete request from IP: " + clientIp);
        
        // Only allow requests from Docker internal network (172.x.x.x or 10.x.x.x)
        if (!isInternalNetwork(clientIp)) {
            System.out.println("❌ BLOCKED: Request from external network: " + clientIp);
            return ResponseEntity.status(403).body(
                "⛔ Access Denied: This endpoint is only accessible from internal network. " +
                "Your IP: " + clientIp
            );
        }
        
        System.out.println("✅ ALLOWED: Request from internal network: " + clientIp);
        
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok("User deleted successfully from internal network");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error deleting user: " + e.getMessage());
        }
    }
    
    /**
     * Extract client IP address, considering proxy headers
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    /**
     * Check if IP is from Docker internal network (container-to-container)
     * Docker default networks: 172.16.0.0/12, 10.0.0.0/8
     * EXCLUDE gateway IPs (.0.1) which represent external requests
     */
    private boolean isInternalNetwork(String ip) {
        if (ip == null || ip.isEmpty()) {
            return false;
        }
        
        // Block Docker gateway IPs (x.x.x.1) - these are external requests forwarded by Docker
        if (ip.endsWith(".0.1") || ip.endsWith(".1.1")) {
            System.out.println("⚠️  Gateway IP detected (external request): " + ip);
            return false;
        }
        
        // Allow Docker internal container IPs
        if (ip.startsWith("172.")) {
            // Docker bridge network containers: 172.x.x.2 - 172.x.x.254
            // Gateway is 172.x.x.1 (already blocked above)
            System.out.println("✅ Docker internal container IP: " + ip);
            return true;
        }
        
        if (ip.startsWith("10.")) {
            // Docker custom networks
            System.out.println("✅ Docker custom network IP: " + ip);
            return true;
        }
        
        // Block localhost and public IPs
        System.out.println("❌ Public/localhost IP: " + ip);
        return false;
    }
}
