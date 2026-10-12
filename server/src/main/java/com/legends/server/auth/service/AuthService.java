package com.legends.server.auth.service;

import com.legends.server.auth.dto.request.LoginRequest;
import com.legends.server.auth.dto.request.RegisterRequest;
import com.legends.server.auth.dto.request.ResendVerificationCodeRequest;
import com.legends.server.auth.dto.request.VerifyEmailRequest;
import com.legends.server.auth.dto.response.AuthResponse;
import com.legends.server.auth.dto.response.UserDetailsResponse;
import com.legends.server.auth.entity.RefreshToken;
import com.legends.server.auth.entity.Role;
import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.exception.custom.*;
import com.legends.server.security.JwtUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final VerificationCodeService verificationCodeService;

    public AuthService(UserRepository userRepository,  PasswordEncoder passwordEncoder,  JwtUtil jwtUtil,  RefreshTokenService refreshTokenService, VerificationCodeService verificationCodeService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.verificationCodeService = verificationCodeService;
    }

    @Transactional
    public void registerUser(RegisterRequest request) {

        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new DuplicateResourceException("Username already exists");
        }

        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new DuplicateResourceException("Email already exists");
        }

        String hashedPassword = passwordEncoder.encode(request.password());

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(hashedPassword);
        user.setRole(Role.USER);

        User savedUser = userRepository.save(user);

        verificationCodeService.createAndSendCode(savedUser);
    }

    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.isEmailVerf()) {
            throw new InvalidVerificationCodeException("Email is already verified");
        }

        verificationCodeService.verifyCode(user, request.code());
    }

    @Transactional
    public AuthResponse loginUser(LoginRequest request) {

        User user = userRepository.findByEmail(request.email()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        if (!user.isEmailVerf()) {
            throw new EmailNotVerifiedException("Email is not verified");
        }

        if (!user.isActive()) {
            throw new InactiveUserException("User account is inactive");
        }

        String accessToken = jwtUtil.generateToken(user.getId(), user.getRole().name());

        RefreshToken refreshToken = refreshTokenService.create(user);

        return new AuthResponse(accessToken, refreshToken.getToken());
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        Long userId = refreshTokenService.validate(refreshToken);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String newAccessToken = jwtUtil.generateToken(user.getId(), user.getRole().name());
        RefreshToken newRefreshToken = refreshTokenService.create(user);

        return new AuthResponse(newAccessToken, newRefreshToken.getToken());
    }

    @Transactional
    public void resendVerificationCode(ResendVerificationCodeRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.isEmailVerf()) {
            throw new InvalidVerificationCodeException("Email is already verified");
        }

        verificationCodeService.resendCode(user);
    }

    @Transactional
    public void logoutUser(String refreshToken) {
        refreshTokenService.deleteToken(refreshToken);
    }

    @Transactional(readOnly = true)
    public UserDetailsResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserDetailsResponse.from(user);
    }

    @Transactional(readOnly = true)
    public Page<UserDetailsResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(UserDetailsResponse::from);
    }

}
