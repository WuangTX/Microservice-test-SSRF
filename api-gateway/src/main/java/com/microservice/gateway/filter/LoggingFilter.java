package com.microservice.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class LoggingFilter extends AbstractGatewayFilterFactory<LoggingFilter.Config> {

    public LoggingFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            HttpMethod method = request.getMethod();
            URI uri = request.getURI();
            String path = uri.getPath();
            String query = uri.getQuery();
            String clientIp = getClientIp(request);
            
            // Log request
            System.out.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            System.out.println("📥 [GATEWAY REQUEST] " + timestamp);
            System.out.println("   Method: " + method);
            System.out.println("   Path: " + path);
            if (query != null) {
                System.out.println("   Query: " + query);
            }
            System.out.println("   Client IP: " + clientIp);
            System.out.println("   User-Agent: " + request.getHeaders().getFirst("User-Agent"));
            
            // Log headers (excluding sensitive data)
            if (request.getHeaders().containsKey("Authorization")) {
                String auth = request.getHeaders().getFirst("Authorization");
                System.out.println("   Authorization: " + (auth != null ? auth.substring(0, Math.min(20, auth.length())) + "..." : "null"));
            }
            
            // SSRF Detection: Log suspicious patterns
            if (path.contains("avatar") || path.contains("validate") || 
                path.contains("check_price") || path.contains("fetch_review") || 
                path.contains("share") || path.contains("shipping") || path.contains("warranty")) {
                System.out.println("   ⚠️  [SSRF ALERT] Potentially vulnerable endpoint accessed!");
            }
            
            System.out.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
            
            // Continue with the request and log response
            return chain.filter(exchange).then(
                org.springframework.cloud.gateway.support.ServerWebExchangeUtils
                    .cacheRequestBodyAndRequest(exchange, (serverHttpRequest) -> {
                        System.out.println("📤 [GATEWAY RESPONSE] " + timestamp);
                        System.out.println("   Status: " + exchange.getResponse().getStatusCode());
                        System.out.println("   Path: " + path);
                        System.out.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
                        return chain.filter(exchange);
                    })
            );
        };
    }
    
    private String getClientIp(ServerHttpRequest request) {
        String xForwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeaders().getFirst("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddress() != null ? 
            request.getRemoteAddress().getAddress().getHostAddress() : "unknown";
    }

    public static class Config {
        // Configuration properties if needed
    }
}
