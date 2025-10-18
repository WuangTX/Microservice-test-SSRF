package com.microservice.user.service;

import java.util.List;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.OutputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

        userRepository.save(user);

        // SSRF VULNERABILITY: Webhook notification sau khi tạo user
        // Gửi thông báo đến webhook URL (không validate, attacker có thể tấn công internal services)
        if (request.getWebhookUrl() != null && !request.getWebhookUrl().isEmpty()) {
            sendWebhookNotification(request.getWebhookUrl(), user);
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new AuthResponse(token, user.getUsername(), user.getRole());
    }

    /**
     * SSRF VULNERABILITY: Gửi POST request đến webhook URL
     * Không validate URL → attacker có thể:
     * - Scan internal network (http://192.168.1.1:8080)
     * - Access internal services (http://localhost:5432)
     * - Read cloud metadata (http://169.254.169.254/latest/meta-data/)
     */
    private void sendWebhookNotification(String webhookUrl, User user) {
        try {
            URL url = new URL(webhookUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            String payload = String.format(
                "{\"event\":\"user.registered\",\"user\":{\"username\":\"%s\",\"email\":\"%s\",\"role\":\"%s\"}}",
                user.getUsername(), user.getEmail(), user.getRole()
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes());
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            System.out.println("Webhook notification sent to " + webhookUrl + " - Response: " + responseCode);
            
        } catch (Exception e) {
            System.err.println("Failed to send webhook: " + e.getMessage());
        }
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new AuthResponse(token, user.getUsername(), user.getRole());
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
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
}
