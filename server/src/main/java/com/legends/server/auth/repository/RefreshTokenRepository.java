package com.legends.server.auth.repository;

import com.legends.server.auth.entity.RefreshToken;
import com.legends.server.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser(User user);
    void deleteAllByExpiresAtBefore(Instant time);
    void deleteByUser(User user);

}
