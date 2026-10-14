package com.legends.server.auth.service;

import com.legends.server.auth.entity.Code;
import com.legends.server.auth.entity.User;
import com.legends.server.auth.entity.VerificationCodePurpose;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.auth.repository.VerificationCodeRepository;
import com.legends.server.exception.custom.InvalidVerificationCodeException;
import com.legends.server.exception.custom.VerificationCodeExpiredException;
import com.legends.server.exception.custom.VerificationResendTooSoonException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class VerificationCodeService {

    private final VerificationCodeRepository codeRepository;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final PasswordEncoder passwordEncoder;

    @Value("${app.email.verification-resend-cooldown-seconds}")
    private long resendCooldownSeconds;

    @Value("${app.email.verification-expiration-minutes}")
    private long expirationMinutes;

    public VerificationCodeService(VerificationCodeRepository codeRepository, PasswordEncoder passwordEncoder, EmailService emailService, UserRepository userRepository) {
        this.codeRepository = codeRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.userRepository = userRepository;
    }

    private void createAndSendCode(User user, VerificationCodePurpose purpose) {
        codeRepository.deleteByUserAndPurpose(user, purpose);
        codeRepository.flush(); // ensure the old code is deleted before inserting the new one.

        String rawCode = String.format("%06d", secureRandom.nextInt(1_000_000));

        Code code = new Code();
        code.setUser(user);
        code.setPurpose(purpose);
        code.setCode(passwordEncoder.encode(rawCode));
        code.setExpiresAt(Instant.now().plus(expirationMinutes, ChronoUnit.MINUTES));

        codeRepository.save(code);

        if (purpose == VerificationCodePurpose.EMAIL_VERIFICATION) {
            emailService.sendVerificationEmail(user.getEmail(), rawCode);
        }

        if(purpose == VerificationCodePurpose.PASSWORD_RESET){
            emailService.sendPasswordResetEmail(user.getEmail(), rawCode);
        }
    }

    @Transactional
    public void createAndSendEmailVerificationCode(User user) {
        createAndSendCode(user, VerificationCodePurpose.EMAIL_VERIFICATION);
    }

    @Transactional
    public void verifyEmailCode(User user, String rawCode) {
        Code code = getValidCode(user, VerificationCodePurpose.EMAIL_VERIFICATION, rawCode);

        user.setEmailVerf(true);
        user.setActive(true);
        codeRepository.delete(code);
    }


    @Transactional
    public void createAndSendPasswordResetCode(User user) {
        checkCooldown(user, VerificationCodePurpose.PASSWORD_RESET);
        createAndSendCode(user, VerificationCodePurpose.PASSWORD_RESET);
    }
    @Transactional
    public void verifyPasswordResetCode(User user, String rawCode) {
        Code code = getValidCode(user, VerificationCodePurpose.PASSWORD_RESET, rawCode);

        codeRepository.delete(code);
    }

    @Transactional
    public void resendEmailVerificationCode(User user) {
        checkCooldown(user, VerificationCodePurpose.EMAIL_VERIFICATION);
        createAndSendEmailVerificationCode(user);
    }

    private void checkCooldown(User user, VerificationCodePurpose purpose) {
        codeRepository.findByUserAndPurpose(user, purpose).ifPresent(existingCode -> {
            Instant nextAllowedTime = existingCode
                    .getCreatedAt()
                    .plusSeconds(resendCooldownSeconds);

            if (nextAllowedTime.isAfter(Instant.now())) {
                long remainingSeconds = Duration.between(Instant.now(), nextAllowedTime).getSeconds();
                throw new VerificationResendTooSoonException("Please wait " + remainingSeconds + " seconds before requesting a new code");
            }
        });
    }

    private Code getValidCode(User user, VerificationCodePurpose purpose, String rawCode) {
        Code code = codeRepository
                .findByUserAndPurpose(user, purpose)
                .orElseThrow(() -> new InvalidVerificationCodeException("Invalid verification code"));

        if (code.getExpiresAt().isBefore(Instant.now())) {
            codeRepository.delete(code);
            throw new VerificationCodeExpiredException("Verification code has expired");
        }

        if (!passwordEncoder.matches(rawCode, code.getCode())) {
            throw new InvalidVerificationCodeException("Invalid verification code");
        }

        return code;
    }
}