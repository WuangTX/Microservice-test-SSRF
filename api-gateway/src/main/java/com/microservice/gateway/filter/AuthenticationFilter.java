package com.microservice.gateway.filter;

import com.microservice.gateway.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {

    @Autowired
    private JwtUtil jwtUtil;

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            
            // Check if Authorization header exists
            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                return onError(exchange, "Missing Authorization header", HttpStatus.UNAUTHORIZED);
            }

            String authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return onError(exchange, "Invalid Authorization header format", HttpStatus.UNAUTHORIZED);
            }

            String token = authHeader.substring(7);
            
            try {
                // Validate JWT token
                if (!jwtUtil.validateToken(token)) {
                    return onError(exchange, "Invalid or expired token", HttpStatus.UNAUTHORIZED);
                }
                
                // Extract username and role from token
                String username = jwtUtil.extractUsername(token);
                String role = jwtUtil.extractRole(token);
                
                // Add user info to request headers for downstream services
                ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                    .header("X-User-Username", username)
                    .header("X-User-Role", role)
                    .build();
                
                System.out.println("✅ [AUTH] User authenticated: " + username + " (" + role + ")");
                
                return chain.filter(exchange.mutate().request(modifiedRequest).build());
                
            } catch (Exception e) {
                System.err.println("❌ [AUTH] Token validation failed: " + e.getMessage());
                return onError(exchange, "Authentication failed: " + e.getMessage(), HttpStatus.UNAUTHORIZED);
            }
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        System.err.println("❌ [AUTH] " + message + " - Path: " + exchange.getRequest().getPath());
        return response.setComplete();
    }

    public static class Config {
        // Configuration properties if needed
    }
}
