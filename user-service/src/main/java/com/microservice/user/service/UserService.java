package com.microservice.user.service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.microservice.user.dto.AuthResponse;
import com.microservice.user.dto.LoginRequest;
import com.microservice.user.dto.RegisterRequest;
import com.microservice.user.model.User;
import com.microservice.user.repository.UserRepository;
import com.microservice.user.security.JwtUtil;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setRole(request.getRole());

        user = userRepository.save(user);

        // BLIND SSRF VULNERABILITY: Tự động validate email domain
        // Tạo URL từ email domain của user để "kiểm tra tính hợp lệ"
        validateEmailDomain(user.getEmail(), user);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new AuthResponse(token, user.getUsername(), user.getRole(), user.getId());
    }

    /**
     * BLIND SSRF VULNERABILITY: "Email Domain Validation"
     * Tự động tạo URL từ email domain để kiểm tra tính hợp lệ
     * Attacker có thể đăng ký với email: admin@192.168.1.1 hoặc admin@localhost:8080
     * → Server sẽ gọi http://192.168.1.1/api/email/validate hoặc http://localhost:8080/api/email/validate
     */
    private void validateEmailDomain(String email, User user) {
        try {
            // Extract domain từ email
            String domain = email.substring(email.indexOf("@") + 1);
            
            // Tạo URL để "validate" email domain
            // VULNERABLE: Không filter internal IPs, localhost, private networks
            String validationUrl = "http://" + domain + "/api/email/validate";
            
            URL url = new URL(validationUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("User-Agent", "MicroserviceShop/1.0 EmailValidator");
            conn.setDoOutput(true);
            conn.setConnectTimeout(3000);  // Short timeout to avoid hanging
            conn.setReadTimeout(3000);

            String payload = String.format(
                "{\"email\":\"%s\",\"username\":\"%s\",\"validation_purpose\":\"user_registration\"}",
                user.getEmail(), user.getUsername()
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes());
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            System.out.println("[EMAIL_VALIDATION] Validated domain " + domain + " - Response: " + responseCode);
            
            // Additional SSRF attempt: Also check MX record validation service
            if (responseCode >= 400) {
                // Fallback: Try alternative validation endpoint
                String mxValidationUrl = "http://" + domain + ":25/mx/check";
                tryAlternativeValidation(mxValidationUrl, email);
            }
            
        } catch (Exception e) {
            System.err.println("[EMAIL_VALIDATION] Failed to validate domain for " + email + ": " + e.getMessage());
            // Don't fail registration even if validation fails
        }
    }
    
    /**
     * Additional SSRF vector: Alternative validation attempt
     */
    private void tryAlternativeValidation(String url, String email) {
        try {
            URL validationUrl = new URL(url);
            HttpURLConnection conn = (HttpURLConnection) validationUrl.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(2000);
            conn.setReadTimeout(2000);
            
            int responseCode = conn.getResponseCode();
            System.out.println("[MX_VALIDATION] Alternative validation for " + email + " - Response: " + responseCode);
            
        } catch (Exception e) {
            System.err.println("[MX_VALIDATION] Alternative validation failed: " + e.getMessage());
        }
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new AuthResponse(token, user.getUsername(), user.getRole(), user.getId());
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUser(Long id, User userDetails) {
        User user = getUserById(id);
        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail());
        user.setRole(userDetails.getRole());
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }

    /**
     * SSRF VULNERABILITY: Upload avatar from external URL
     * Fetches image from provided URL without validation
     * Attacker can:
     * - Access internal services (http://localhost:8080/admin)
     * - Scan internal network (http://192.168.1.1:8080)
     * - Read cloud metadata (http://169.254.169.254/latest/meta-data/)
     */
    public String uploadAvatarFromUrl(Long userId, String imageUrl) {
        User user = getUserById(userId);
        
        try {
            System.out.println("[AVATAR_UPLOAD] Fetching image from: " + imageUrl);
            
            URL url = new URL(imageUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "MicroserviceShop/1.0 AvatarUploader");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            
            int responseCode = conn.getResponseCode();
            String contentType = conn.getContentType();
            int contentLength = conn.getContentLength();
            
            System.out.println("[AVATAR_UPLOAD] Response: " + responseCode + ", Content-Type: " + contentType + ", Length: " + contentLength);
            
            // Read response body (for SSRF data exfiltration)
            StringBuilder responseBody = new StringBuilder();
            try (InputStream inputStream = (responseCode >= 200 && responseCode < 300) ? 
                    conn.getInputStream() : conn.getErrorStream()) {
                
                if (inputStream != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                        String line;
                        int maxLines = 10; // Limit to prevent memory issues
                        int lineCount = 0;
                        while ((line = reader.readLine()) != null && lineCount < maxLines) {
                            responseBody.append(line).append("\n");
                            lineCount++;
                        }
                    }
                }
            }
            
            // Log response for SSRF demonstration
            System.out.println("[AVATAR_UPLOAD] Response body preview: " + responseBody.toString().substring(0, Math.min(200, responseBody.length())));
            
            if (responseCode >= 200 && responseCode < 300) {
                // Validate content type (weak validation for demo)
                if (contentType != null && (contentType.startsWith("image/") || 
                    contentType.startsWith("text/") || contentType.startsWith("application/"))) {
                    
                    // Save avatar URL to user
                    user.setAvatarUrl(imageUrl);
                    userRepository.save(user);
                    
                    return "Image validated and saved successfully. Type: " + contentType + ", Size: " + contentLength + " bytes";
                } else {
                    return "Invalid content type: " + contentType + ". Expected image/* but will save anyway for demo.";
                }
            } else {
                return "Failed to fetch image. HTTP " + responseCode + ": " + responseBody.toString();
            }
            
        } catch (Exception e) {
            System.err.println("[AVATAR_UPLOAD] Error fetching image from " + imageUrl + ": " + e.getMessage());
            return "Error fetching image: " + e.getMessage();
        }
    }

    /**
     * File upload method that saves file and generates real URL
     */
    public String uploadAvatarFile(Long userId, MultipartFile file) {
        try {
            User user = getUserById(userId);
            
            // Create uploads directory if not exists
            Path uploadDir = Paths.get("uploads");
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            
            // Generate unique filename
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadDir.resolve(fileName);
            
            // Save file to disk
            Files.copy(file.getInputStream(), filePath);
            
            // Generate URL pointing to our file endpoint
            String fileUrl = "http://localhost:8081/api/files/" + fileName;
            
            System.out.println("[FILE_UPLOAD] File saved: " + filePath.toAbsolutePath());
            System.out.println("[FILE_UPLOAD] File URL: " + fileUrl);
            System.out.println("[FILE_UPLOAD] File size: " + file.getSize() + " bytes");
            
            // Save avatar URL to user
            user.setAvatarUrl(fileUrl);
            userRepository.save(user);
            
            System.out.println("[FILE_UPLOAD] Success! Avatar URL set to: " + fileUrl);
            return fileUrl; // Return the URL instead of message
            
        } catch (Exception e) {
            System.err.println("[FILE_UPLOAD] Error: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error processing file: " + e.getMessage());
        }
    }

    /**
     * SSRF VULNERABILITY: Validate avatar URL by fetching it
     * This method is designed to be easily exploitable for SSRF attacks
     * User can validate any URL and get response details
     * 
     * VULNERABLE BEHAVIORS:
     * 1. No URL validation - accepts any protocol/host
     * 2. Returns response body content
     * 3. Returns detailed error information
     * 4. No timeout or size limits
     */
    public Map<String, Object> validateAvatarUrl(String imageUrl) {
        try {
            System.out.println("[AVATAR_VALIDATION] Validating URL: " + imageUrl);
            
            URL url = new URL(imageUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "MicroserviceShop/1.0 AvatarValidator");
            conn.setConnectTimeout(10000);  // 10 second timeout
            conn.setReadTimeout(10000);
            
            int responseCode = conn.getResponseCode();
            String contentType = conn.getContentType();
            int contentLength = conn.getContentLength();
            
            // Read response body (SSRF data exfiltration)
            StringBuilder responseBody = new StringBuilder();
            try (InputStream inputStream = (responseCode >= 200 && responseCode < 400) ? 
                    conn.getInputStream() : conn.getErrorStream()) {
                
                if (inputStream != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                        String line;
                        int maxLines = 50; // Allow more lines for better data exfiltration
                        int lineCount = 0;
                        while ((line = reader.readLine()) != null && lineCount < maxLines) {
                            responseBody.append(line).append("\n");
                            lineCount++;
                        }
                    }
                }
            }
            
            // Get headers for additional information disclosure
            Map<String, String> responseHeaders = new HashMap<>();
            conn.getHeaderFields().forEach((key, values) -> {
                if (key != null && !values.isEmpty()) {
                    responseHeaders.put(key, values.get(0));
                }
            });
            
            System.out.println("[AVATAR_VALIDATION] Response code: " + responseCode);
            System.out.println("[AVATAR_VALIDATION] Content type: " + contentType);
            System.out.println("[AVATAR_VALIDATION] Response preview: " + 
                responseBody.toString().substring(0, Math.min(100, responseBody.length())));
            
            // Return detailed validation results (information disclosure)
            Map<String, Object> result = new HashMap<>();
            result.put("status", "success");
            result.put("httpCode", responseCode);
            result.put("contentType", contentType);
            result.put("contentLength", contentLength);
            result.put("responseBody", responseBody.toString());
            result.put("headers", responseHeaders);
            result.put("url", imageUrl);
            result.put("timestamp", System.currentTimeMillis());
            
            // Determine if it's a valid image (weak validation)
            boolean isValidImage = contentType != null && 
                (contentType.startsWith("image/") || 
                 contentType.contains("json") ||  // Allow JSON for API responses
                 contentType.contains("html") ||  // Allow HTML for web pages
                 contentType.contains("text"));   // Allow text for debugging
            
            result.put("isValidImage", isValidImage);
            result.put("recommendation", isValidImage ? 
                "URL appears to be valid for avatar" : 
                "URL may not be a valid image, but validation completed");
            
            return result;
            
        } catch (Exception e) {
            System.err.println("[AVATAR_VALIDATION] Error validating " + imageUrl + ": " + e.getMessage());
            
            // Return error details (information disclosure)
            Map<String, Object> result = new HashMap<>();
            result.put("status", "error");
            result.put("error", e.getClass().getSimpleName());
            result.put("message", e.getMessage());
            result.put("url", imageUrl);
            result.put("timestamp", System.currentTimeMillis());
            result.put("hint", "Network error or invalid URL. Try different target.");
            
            return result;
        }
    }
}
