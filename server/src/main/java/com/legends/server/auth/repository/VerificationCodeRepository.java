package com.legends.server.auth.repository;
import com.legends.server.auth.entity.Code;
import com.legends.server.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
public interface VerificationCodeRepository extends JpaRepository<Code,Long> {
        Optional<Code> findByUser(User user);
        void deleteAllByUser(User user);
        void deleteAllByExpiresAtBefore(Instant time);
}
