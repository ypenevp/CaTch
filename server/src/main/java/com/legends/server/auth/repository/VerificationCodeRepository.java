package com.legends.server.auth.repository;
import com.legends.server.auth.entity.Code;
import com.legends.server.auth.entity.User;
import com.legends.server.auth.entity.VerificationCodePurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
public interface VerificationCodeRepository extends JpaRepository<Code,Long> {
        Optional<Code> findByUserAndPurpose(User user, VerificationCodePurpose purpose);
        void deleteByUserAndPurpose(User user, VerificationCodePurpose purpose);
        void deleteAllByExpiresAtBefore(Instant time);
}
