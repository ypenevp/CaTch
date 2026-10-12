package com.legends.server.auth.service;

import com.legends.server.auth.entity.RefreshToken;
import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.RefreshTokenRepository;
import com.legends.server.exception.custom.InvalidRefreshTokenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repository;

    @Value("${REFRESH_EXPIRES_DAYS}")
    private Long tokenExpiresDays;

    public RefreshTokenService(RefreshTokenRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public RefreshToken create(User user) {

        Optional<RefreshToken> existingToken = repository.findByUser(user);

        if (existingToken.isPresent()) {
            RefreshToken token = existingToken.get();
            token.setToken(UUID.randomUUID().toString());
            token.setExpiresAt(Instant.now().plus(Duration.ofDays(tokenExpiresDays)));
            return repository.save(token);
        }

        RefreshToken newToken = new RefreshToken();
        newToken.setUser(user);
        newToken.setToken(UUID.randomUUID().toString());
        newToken.setExpiresAt(Instant.now().plus(Duration.ofDays(tokenExpiresDays)));
        return repository.save(newToken);
    }

    @Transactional
    public Long validate(String token) {
        RefreshToken refreshToken = repository.findByToken(token)
                .orElseThrow(() -> new InvalidRefreshTokenException("Invalid refresh token"));

        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            repository.delete(refreshToken);
            throw new InvalidRefreshTokenException("Refresh token expired");
        }

        return refreshToken.getUser().getId();

    }

    @Transactional
    public void deleteToken(String token) {
        RefreshToken refreshToken = repository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));
        repository.deleteById(refreshToken.getId());
    }

    @Scheduled(cron = "0 0 15 * * *")
    public void deleteExpiredTokens() {
        repository.deleteAllByExpiresAtBefore(Instant.now());
    }

}

