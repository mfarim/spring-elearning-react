package com.elearning.config;

import com.elearning.modules.exam.repository.ExaminationRepository;
import com.elearning.security.CustomUserDetailsService;
import com.elearning.security.JwtProvider;
import com.elearning.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /** The only broadcast destination clients may subscribe to (exact match, no wildcards). */
    private static final Pattern EXAM_MONITOR_DESTINATION = Pattern.compile("^/topic/exams/(\\d+)/monitor$");
    /** Private per-user queues resolved by Spring (/user/queue/...). */
    private static final Pattern USER_QUEUE_DESTINATION = Pattern.compile("^/user/queue/[A-Za-z0-9_\\-/]+$");

    private final JwtProvider jwtProvider;
    private final CustomUserDetailsService userDetailsService;
    private final ExaminationRepository examinationRepository;

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private List<String> allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toArray(String[]::new);

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .withSockJS();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }

                switch (accessor.getCommand()) {
                    case CONNECT, STOMP -> authenticate(accessor);
                    case SUBSCRIBE -> authorizeSubscribe(accessor);
                    case SEND -> authorizeSend(accessor);
                    default -> { /* DISCONNECT, UNSUBSCRIBE, ACK, ... */ }
                }
                return message;
            }
        });
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (!StringUtils.hasText(authHeader)) {
            authHeader = accessor.getFirstNativeHeader("token");
        }
        if (!StringUtils.hasText(authHeader)) {
            log.warn("Missing Authorization header during WebSocket CONNECT");
            throw new AccessDeniedException("Authentication token required for WebSocket connection");
        }

        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        if (!jwtProvider.validateAccessToken(token)) {
            log.warn("Invalid JWT token during WebSocket CONNECT");
            throw new AccessDeniedException("Invalid or expired WebSocket authentication token");
        }

        UserPrincipal userDetails;
        try {
            userDetails = (UserPrincipal) userDetailsService.loadUserById(
                    jwtProvider.getUserIdFromToken(token),
                    jwtProvider.getImpersonatorAdminIdFromToken(token));
        } catch (UsernameNotFoundException e) {
            throw new AccessDeniedException("User no longer exists");
        }
        if (!userDetails.isEnabled()) {
            throw new AccessDeniedException("Account is inactive");
        }

        accessor.setUser(new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
        log.debug("WebSocket authenticated for user id {}", userDetails.getId());
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        UserPrincipal user = requireUser(accessor.getUser());
        String destination = accessor.getDestination();

        // Deny-by-default. Pattern subscriptions (e.g. /topic/** or /topic/exams/*/monitor) are rejected
        // because the simple broker would otherwise deliver every matching destination.
        if (destination == null || destination.contains("*") || destination.contains("{") || destination.contains("?")) {
            throw deny(user, destination);
        }

        Matcher monitor = EXAM_MONITOR_DESTINATION.matcher(destination);
        if (monitor.matches()) {
            Long examId = Long.valueOf(monitor.group(1));
            boolean isAdmin = hasRole(user, "ROLE_ADMIN");
            boolean isOwnerTeacher = hasRole(user, "ROLE_TEACHER")
                    && examinationRepository.existsByIdAndTeacher_User_Id(examId, user.getId());
            if (!isAdmin && !isOwnerTeacher) {
                throw deny(user, destination);
            }
            return;
        }

        if (USER_QUEUE_DESTINATION.matcher(destination).matches()) {
            return;
        }

        throw deny(user, destination);
    }

    private void authorizeSend(StompHeaderAccessor accessor) {
        UserPrincipal user = requireUser(accessor.getUser());
        String destination = accessor.getDestination();
        // Clients may only send to application handlers (/app/**), never straight to the broker,
        // otherwise anyone could inject fake events into /topic/exams/{id}/monitor.
        if (destination == null || !destination.startsWith("/app/")) {
            throw deny(user, destination);
        }
    }

    private UserPrincipal requireUser(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal;
        }
        throw new AccessDeniedException("Authentication required");
    }

    private boolean hasRole(UserPrincipal user, String role) {
        return user.getAuthorities().stream().anyMatch(a -> role.equals(a.getAuthority()));
    }

    private AccessDeniedException deny(UserPrincipal user, String destination) {
        log.warn("Forbidden WebSocket destination '{}' requested by user id {}", destination, user.getId());
        return new AccessDeniedException("Forbidden destination");
    }
}
