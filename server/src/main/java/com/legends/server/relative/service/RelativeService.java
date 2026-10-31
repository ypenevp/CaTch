package com.legends.server.relative.service;

import com.legends.server.auth.dto.response.AuthResponse;
import com.legends.server.auth.entity.RefreshToken;
import com.legends.server.auth.entity.Role;
import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.auth.service.RefreshTokenService;
import com.legends.server.exception.custom.DuplicateResourceException;
import com.legends.server.exception.custom.InvalidRelativeInvitationException;
import com.legends.server.exception.custom.ResourceNotFoundException;
import com.legends.server.relative.dto.request.InviteRelativeRequest;
import com.legends.server.relative.dto.response.LinkedUserResponse;
import com.legends.server.relative.dto.response.RelativeInvitationResponse;
import com.legends.server.relative.dto.response.RelativeResponse;
import com.legends.server.relative.entity.UserRelative;
import com.legends.server.relative.entity.UserRelativeStatus;
import com.legends.server.relative.repository.UserRelativeRepository;
import com.legends.server.security.JwtUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class RelativeService {

    private final UserRelativeRepository userRelativeRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;

    public RelativeService(
            UserRelativeRepository userRelativeRepository,
            UserRepository userRepository,
            JwtUtil jwtUtil,
            RefreshTokenService refreshTokenService
    ) {
        this.userRelativeRepository = userRelativeRepository;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public RelativeResponse inviteRelative(InviteRelativeRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // admin and factory accounts can never become relatives, so they are reported as missing
        User relative = userRepository.findByUsername(request.username())
                .filter(found -> found.getRole() == Role.USER || found.getRole() == Role.RELATIVE)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (relative.getId().equals(user.getId())) {
            throw new InvalidRelativeInvitationException("You cannot invite yourself");
        }

        if (userRelativeRepository.existsByUserIdAndRelativeId(user.getId(), relative.getId())) {
            throw new DuplicateResourceException("This user is already invited or linked as your relative");
        }

        UserRelative link = new UserRelative();
        link.setUser(user);
        link.setRelative(relative);
        link.setStatus(UserRelativeStatus.PENDING);

        return RelativeResponse.from(userRelativeRepository.save(link));
    }

    @Transactional(readOnly = true)
    public Page<RelativeResponse> getMyRelatives(Long userId, Pageable pageable) {
        return userRelativeRepository.findAllByUserId(userId, pageable)
                .map(RelativeResponse::from);
    }

    // cancels a pending invitation or removes an accepted relative
    @Transactional
    public void removeRelative(Long relativeId, Long userId) {
        UserRelative link = userRelativeRepository.findByUserIdAndRelativeId(userId, relativeId)
                .orElseThrow(() -> new ResourceNotFoundException("Relative not found"));
        deleteLink(link);
    }

    @Transactional(readOnly = true)
    public Page<RelativeInvitationResponse> getMyInvitations(Long relativeId, Pageable pageable) {
        return userRelativeRepository.findAllByRelativeIdAndStatus(relativeId, UserRelativeStatus.PENDING, pageable)
                .map(RelativeInvitationResponse::from);
    }

    // the role changes on the first accepted invitation, so fresh tokens are returned to carry it
    @Transactional
    public AuthResponse acceptInvitation(Long invitationId, Long relativeId) {
        UserRelative link = findPendingInvitation(invitationId, relativeId);
        link.setStatus(UserRelativeStatus.ACCEPTED);
        link.setAcceptedAt(Instant.now());

        User relative = link.getRelative();
        if (relative.getRole() == Role.USER) {
            relative.setRole(Role.RELATIVE);
        }

        String accessToken = jwtUtil.generateToken(relative.getId(), relative.getRole().name());
        RefreshToken refreshToken = refreshTokenService.create(relative);

        return new AuthResponse(accessToken, refreshToken.getToken());
    }

    @Transactional
    public void declineInvitation(Long invitationId, Long relativeId) {
        UserRelative link = findPendingInvitation(invitationId, relativeId);
        userRelativeRepository.delete(link);
    }

    @Transactional(readOnly = true)
    public Page<LinkedUserResponse> getLinkedUsers(Long relativeId, Pageable pageable) {
        return userRelativeRepository.findAllByRelativeIdAndStatus(relativeId, UserRelativeStatus.ACCEPTED, pageable)
                .map(LinkedUserResponse::from);
    }

    @Transactional
    public void unlinkUser(Long userId, Long relativeId) {
        UserRelative link = userRelativeRepository
                .findByUserIdAndRelativeIdAndStatus(userId, relativeId, UserRelativeStatus.ACCEPTED)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        deleteLink(link);
    }

    private UserRelative findPendingInvitation(Long invitationId, Long relativeId) {
        return userRelativeRepository
                .findByIdAndRelativeIdAndStatus(invitationId, relativeId, UserRelativeStatus.PENDING)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));
    }

    // a relative who is no longer linked to anyone goes back to being a regular user
    private void deleteLink(UserRelative link) {
        User relative = link.getRelative();
        userRelativeRepository.delete(link);
        userRelativeRepository.flush();

        if (relative.getRole() == Role.RELATIVE
                && !userRelativeRepository.existsByRelativeIdAndStatus(relative.getId(), UserRelativeStatus.ACCEPTED)) {
            relative.setRole(Role.USER);
        }
    }
}
