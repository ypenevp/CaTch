package com.legends.server.notification.repository;

import com.legends.server.notification.entity.UserPushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPushTokenRepository extends JpaRepository<UserPushToken, Long> {

    Optional<UserPushToken> findByUserIdAndToken(Long userId, String token);

    Optional<UserPushToken> findByToken(String token);

    List<UserPushToken> findAllByUserIdAndActiveTrue(Long userId);
}
