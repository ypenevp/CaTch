package com.legends.server.notification.service;

import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import com.legends.server.notification.dto.request.RegisterPushTokenRequest;
import com.legends.server.notification.dto.request.RemovePushTokenRequest;
import com.legends.server.notification.entity.UserPushToken;
import com.legends.server.notification.repository.UserPushTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class UserPushTokenService {

    private final UserPushTokenRepository pushTokenRepository;
    private final UserRepository userRepository;

    public UserPushTokenService(
            UserPushTokenRepository pushTokenRepository,
            UserRepository userRepository
    ) {
        this.pushTokenRepository = pushTokenRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void register(RegisterPushTokenRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserPushToken pushToken = pushTokenRepository.findByToken(request.token())
                .orElseGet(UserPushToken::new);
        pushToken.setUser(user);
        pushToken.setToken(request.token());
        pushToken.setPlatform(request.platform());
        pushToken.setDeviceName(request.deviceName());
        pushToken.setActive(true);
        pushToken.setLastSeenAt(Instant.now());
        pushTokenRepository.save(pushToken);
    }

    @Transactional
    public void remove(RemovePushTokenRequest request, Long userId) {
        pushTokenRepository.findByUserIdAndToken(userId, request.token())
                .ifPresent(pushToken -> {
                    pushToken.setActive(false);
                    pushTokenRepository.save(pushToken);
                });
    }
}
