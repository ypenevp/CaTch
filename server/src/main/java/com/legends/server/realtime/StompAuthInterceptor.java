package com.legends.server.realtime;

import com.legends.server.device.service.DeviceAccessService;
import com.legends.server.security.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthInterceptor.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final DeviceAccessService deviceAccessService;

    public StompAuthInterceptor(JwtUtil jwtUtil, DeviceAccessService deviceAccessService) {
        this.jwtUtil = jwtUtil;
        this.deviceAccessService = deviceAccessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        return switch (accessor.getCommand()) {
            case CONNECT, STOMP -> {
                accessor.setUser(authenticate(accessor));
                yield message;
            }
            case SUBSCRIBE -> canSubscribe(accessor) ? message : null;
            // clients only listen; nothing is handled under /app yet
            case SEND -> null;
            default -> message;
        };
    }

    private Authentication authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            throw new StompAuthenticationException();
        }

        try {
            Claims claims = jwtUtil.getTokenClaims(header.substring(BEARER_PREFIX.length()));
            Long userId = jwtUtil.extractUserId(claims);
            String role = jwtUtil.extractRole(claims);
            return new UsernamePasswordAuthenticationToken(
                    userId, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))
            );
        } catch (JwtException | IllegalArgumentException exception) {
            throw new StompAuthenticationException();
        }
    }

    // a refused subscription is dropped instead of closing the whole connection
    private boolean canSubscribe(StompHeaderAccessor accessor) {
        Optional<String> deviceId = DeviceTopics.deviceIdOf(accessor.getDestination());
        if (deviceId.isEmpty() || !(accessor.getUser() instanceof Authentication authentication)) {
            return false;
        }

        Long userId = (Long) authentication.getPrincipal();
        boolean allowed = deviceAccessService.canView(deviceId.get(), userId);
        if (!allowed) {
            log.debug("Refused subscription of user {} to device {}", userId, deviceId.get());
        }
        return allowed;
    }
}
