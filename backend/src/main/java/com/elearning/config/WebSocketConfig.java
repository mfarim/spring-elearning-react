package com.elearning.config;

import com.elearning.security.CustomUserDetailsService;
import com.elearning.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtProvider jwtProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (!StringUtils.hasText(authHeader)) {
                        authHeader = accessor.getFirstNativeHeader("token");
                    }

                    if (StringUtils.hasText(authHeader)) {
                        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
                        if (jwtProvider.validateToken(token)) {
                            Long userId = jwtProvider.getUserIdFromToken(token);
                            Long impersonatorAdminId = jwtProvider.getImpersonatorAdminIdFromToken(token);
                            UserDetails userDetails = userDetailsService.loadUserById(userId, impersonatorAdminId);

                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                            accessor.setUser(authentication);
                            log.debug("WebSocket authenticated for user: {}", userDetails.getUsername());
                        } else {
                            log.warn("Invalid JWT token during WebSocket CONNECT");
                            throw new AccessDeniedException("Invalid or expired WebSocket authentication token");
                        }
                    } else {
                        log.warn("Missing Authorization header during WebSocket CONNECT");
                        throw new AccessDeniedException("Authentication token required for WebSocket connection");
                    }
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    Principal user = accessor.getUser();

                    if (destination != null && destination.startsWith("/topic/exams/") && destination.endsWith("/monitor")) {
                        if (user instanceof UsernamePasswordAuthenticationToken authToken) {
                            boolean canMonitor = authToken.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_TEACHER"));
                            if (!canMonitor) {
                                log.warn("Unauthorized exam monitor subscription attempt by user {}", user.getName());
                                throw new AccessDeniedException("Forbidden: Only teachers and administrators can monitor live exams");
                            }
                        } else {
                            log.warn("Unauthenticated exam monitor subscription attempt to {}", destination);
                            throw new AccessDeniedException("Authentication required to subscribe to exam monitor");
                        }
                    }
                }

                return message;
            }
        });
    }
}
