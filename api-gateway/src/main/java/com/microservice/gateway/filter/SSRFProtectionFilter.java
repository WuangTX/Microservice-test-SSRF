package com.microservice.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetAddress;
import java.net.URL;
import java.util.Arrays;
import java.util.List;

/**
 * SSRF Protection Filter
 * Analyzes requests for SSRF vulnerabilities and blocks suspicious patterns
 */
@Component
public class SSRFProtectionFilter extends AbstractGatewayFilterFactory<SSRFProtectionFilter.Config> {

    // Whitelist of allowed domains for external URL fetching
    private static final List<String> ALLOWED_DOMAINS = Arrays.asList(
        "avatars.githubusercontent.com",
        "i.pravatar.cc",
        "ui-avatars.com",
        "httpbin.org"
    );
    
    // Suspicious patterns that might indicate SSRF attempts
    private static final List<String> SUSPICIOUS_PATTERNS = Arrays.asList(
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "169.254.169.254", // AWS metadata
        "metadata.google.internal", // GCP metadata
        "192.168.",
        "10.",
        "172.",
        "service",
        "postgres",
        "docker",
        "internal"
    );

    public SSRFProtectionFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String path = request.getURI().getPath();
            String query = request.getURI().getQuery();
            
            System.out.println("\n🛡️  [SSRF PROTECTION] Analyzing request...");
            System.out.println("   Path: " + path);
            System.out.println("   Query: " + query);
            
            // Check query parameters for suspicious URLs
            if (query != null) {
                String queryLower = query.toLowerCase();
                
                // Extract URL parameters
                if (queryLower.contains("url=") || 
                    queryLower.contains("image_url=") || 
                    queryLower.contains("compare_url=") ||
                    queryLower.contains("review_url=") ||
                    queryLower.contains("share_api_url=") ||
                    queryLower.contains("callback=") ||
                    queryLower.contains("redirect=")) {
                    
                    System.out.println("   ⚠️  URL parameter detected in query string");
                    
                    // Check for suspicious patterns
                    for (String pattern : SUSPICIOUS_PATTERNS) {
                        if (queryLower.contains(pattern.toLowerCase())) {
                            System.err.println("   ❌ BLOCKED: Suspicious pattern detected: " + pattern);
                            return blockRequest(exchange, "SSRF attempt detected: suspicious URL pattern");
                        }
                    }
                    
                    // Additional check for private IP ranges
                    if (queryLower.matches(".*\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}.*")) {
                        String extractedIp = extractIpFromQuery(query);
                        if (extractedIp != null && isPrivateIp(extractedIp)) {
                            System.err.println("   ❌ BLOCKED: Private IP address detected: " + extractedIp);
                            return blockRequest(exchange, "SSRF attempt detected: private IP address");
                        }
                    }
                }
            }
            
            // Check specific vulnerable endpoints
            if (path.contains("/avatar/validate") || 
                path.contains("/check_price") || 
                path.contains("/fetch_review") ||
                path.contains("/share")) {
                System.out.println("   ⚠️  [HIGH RISK] Known SSRF-vulnerable endpoint");
                System.out.println("   ℹ️  Additional monitoring enabled");
            }
            
            System.out.println("   ✅ Request passed SSRF protection checks");
            
            return chain.filter(exchange);
        };
    }
    
    private Mono<Void> blockRequest(ServerWebExchange exchange, String reason) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().add("X-SSRF-Protection", "blocked");
        
        System.err.println("\n🚨 [SSRF PROTECTION] REQUEST BLOCKED");
        System.err.println("   Reason: " + reason);
        System.err.println("   Path: " + exchange.getRequest().getPath());
        System.err.println("   Client IP: " + exchange.getRequest().getRemoteAddress());
        System.err.println("   Timestamp: " + java.time.LocalDateTime.now());
        System.err.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        
        return response.setComplete();
    }
    
    private String extractIpFromQuery(String query) {
        // Simple IP extraction (can be improved with regex)
        String[] parts = query.split("[=&]");
        for (String part : parts) {
            if (part.matches("\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}")) {
                return part;
            }
        }
        return null;
    }
    
    private boolean isPrivateIp(String ip) {
        try {
            String[] octets = ip.split("\\.");
            if (octets.length != 4) return false;
            
            int first = Integer.parseInt(octets[0]);
            int second = Integer.parseInt(octets[1]);
            
            // 10.0.0.0/8
            if (first == 10) return true;
            
            // 172.16.0.0/12
            if (first == 172 && second >= 16 && second <= 31) return true;
            
            // 192.168.0.0/16
            if (first == 192 && second == 168) return true;
            
            // 127.0.0.0/8 (loopback)
            if (first == 127) return true;
            
            // 169.254.0.0/16 (link-local)
            if (first == 169 && second == 254) return true;
            
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    public static class Config {
        private boolean enableStrictMode = true;
        
        public boolean isEnableStrictMode() {
            return enableStrictMode;
        }
        
        public void setEnableStrictMode(boolean enableStrictMode) {
            this.enableStrictMode = enableStrictMode;
        }
    }
}
