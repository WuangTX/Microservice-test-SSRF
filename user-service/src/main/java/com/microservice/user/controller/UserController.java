package com.microservice.user.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(Authentication authentication) {
        try {
            String username = authentication.getName();
            User user = userService.getUserByUsername(username);
            return ResponseEntity.ok(user);
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

    @PutMapping("/me")
    public ResponseEntity<User> updateCurrentUser(@RequestBody User user, Authentication authentication) {
        try {
            // Get current user from authentication
            String username = authentication.getName();
            User currentUser = userService.getUserByUsername(username);
            
            // Update only allowed fields
            if (user.getEmail() != null) {
                currentUser.setEmail(user.getEmail());
            }
            if (user.getAvatarUrl() != null) {
                currentUser.setAvatarUrl(user.getAvatarUrl());
            }
            
            return ResponseEntity.ok(userService.updateUser(currentUser.getId(), currentUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * SSRF VULNERABLE ENDPOINT: Upload avatar from URL
     * User provides image URL, server fetches and validates the image
     * VULNERABLE: No URL validation - allows internal network access
     * 
     * REALISTIC: Accept both GET and POST để dễ test với blackbox scanner
     * - GET: /api/users/1/avatar?image_url=http://example.com/image.jpg
     * - POST: /api/users/1/avatar với JSON body {"image_url": "..."}
     */
    @RequestMapping(value = "/{id}/avatar", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, String>> uploadAvatar(
            @PathVariable Long id, 
            @RequestParam(value = "image_url", required = false) String imageUrlParam,
            @RequestBody(required = false) Map<String, String> request) {
        try {
            // Accept parameter từ GET query hoặc POST body
            String imageUrl = imageUrlParam;
            if (imageUrl == null && request != null) {
                imageUrl = request.get("image_url");
            }
            
            if (imageUrl == null || imageUrl.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "image_url is required"));
            }
            
            // SSRF VULNERABILITY: Fetch and validate image from provided URL
            String result = userService.uploadAvatarFromUrl(id, imageUrl);
            
            return ResponseEntity.ok(Map.of(
                "message", "Avatar uploaded successfully",
                "avatar_url", imageUrl,
                "validation_result", result
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * File upload endpoint that generates URLs
     * VULNERABLE: Can be used to upload files and then trigger SSRF
     */
    @PostMapping("/{id}/avatar/upload")
    public ResponseEntity<Map<String, String>> uploadAvatarFile(
            @PathVariable Long id, 
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
            }

            // Save file and generate URL
            String result = userService.uploadAvatarFile(id, file);
            
            return ResponseEntity.ok(Map.of(
                "message", "Avatar file uploaded successfully",
                "result", result
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Current user file upload endpoint
     */
    @PostMapping("/me/avatar/upload")
    public ResponseEntity<Map<String, String>> uploadCurrentUserAvatarFile(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
            }

            // Get current user from authentication
            String username = authentication.getName();
            User currentUser = userService.getUserByUsername(username);

            // Save file and generate URL
            String fileUrl = userService.uploadAvatarFile(currentUser.getId(), file);
            
            return ResponseEntity.ok(Map.of(
                "message", "Avatar file uploaded successfully",
                "avatarUrl", fileUrl
            ));
            
        } catch (Exception e) {
            System.err.println("Error uploading avatar file: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * SSRF VULNERABLE ENDPOINT FOR USERS: Validate avatar URL before setting
     * Any authenticated user can use this endpoint to "validate" if an image URL is accessible
     * VULNERABLE: Server fetches URL without validation, allowing SSRF attacks
     * 
     * This is designed to be easily discoverable by SSRF scanning tools
     */
    @PostMapping("/me/avatar/validate")
    public ResponseEntity<Map<String, Object>> validateAvatarUrl(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            String imageUrl = request.get("url");
            if (imageUrl == null || imageUrl.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "url parameter is required",
                    "example", Map.of("url", "https://example.com/image.jpg")
                ));
            }

            // Get current user from authentication
            String username = authentication.getName();
            User currentUser = userService.getUserByUsername(username);
            
            // SSRF VULNERABILITY: Validate URL by fetching it
            Map<String, Object> validationResult = userService.validateAvatarUrl(imageUrl);
            
            return ResponseEntity.ok(Map.of(
                "message", "URL validation completed",
                "url", imageUrl,
                "user", currentUser.getUsername(),
                "validation", validationResult,
                "timestamp", System.currentTimeMillis()
            ));
            
        } catch (Exception e) {
            System.err.println("Error validating avatar URL: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Validation failed: " + e.getMessage(),
                "hint", "Try different URL or check network connectivity"
            ));
        }
    }

    /**
     * GET method for avatar validation (for easier SSRF testing)
     * Allows URL to be passed as query parameter for blackbox scanners
     */
    @GetMapping("/me/avatar/validate")
    public ResponseEntity<Map<String, Object>> validateAvatarUrlGet(
            @RequestParam("url") String imageUrl,
            Authentication authentication) {
        try {
            if (imageUrl == null || imageUrl.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "url parameter is required",
                    "usage", "GET /api/users/me/avatar/validate?url=https://example.com/image.jpg"
                ));
            }

            // Get current user from authentication
            String username = authentication.getName();
            User currentUser = userService.getUserByUsername(username);
            
            // SSRF VULNERABILITY: Validate URL by fetching it
            Map<String, Object> validationResult = userService.validateAvatarUrl(imageUrl);
            
            return ResponseEntity.ok(Map.of(
                "message", "URL validation completed",
                "url", imageUrl,
                "user", currentUser.getUsername(),
                "validation", validationResult,
                "method", "GET",
                "timestamp", System.currentTimeMillis()
            ));
            
        } catch (Exception e) {
            System.err.println("Error validating avatar URL: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Validation failed: " + e.getMessage(),
                "hint", "Try different URL or check network connectivity"
            ));
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
