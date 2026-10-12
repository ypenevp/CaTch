package com.legends.server.auth.service;

import com.legends.server.auth.dto.request.LoginRequest;
import com.legends.server.auth.dto.request.RegisterRequest;
import com.legends.server.auth.dto.response.AuthResponse;
import com.legends.server.auth.dto.response.UserDetailsResponse;
import com.legends.server.auth.entity.RefreshToken;
import com.legends.server.auth.entity.Role;
import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.exception.custom.DuplicateResourceException;
import com.legends.server.exception.custom.InvalidCredentialsException;
import com.legends.server.exception.custom.ResourceNotFoundException;
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

    public AuthService(UserRepository userRepository,  PasswordEncoder passwordEncoder,  JwtUtil jwtUtil,  RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public void registerUser(RegisterRequest request) {

        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new DuplicateResourceException("Username already exists");
        }

        String hashedPassword = passwordEncoder.encode(request.password());

        User user = new User();
        user.setUsername(request.username());
        user.setPassword(hashedPassword);
        user.setRole(Role.USER);

        userRepository.save(user);
    }

    @Transactional
    public AuthResponse loginUser(LoginRequest request) {

        User user = userRepository.findByUsername(request.username()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid username or password");
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
