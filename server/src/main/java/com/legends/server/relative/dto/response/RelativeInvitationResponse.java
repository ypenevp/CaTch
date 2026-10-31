package com.legends.server.relative.dto.response;

import com.legends.server.relative.entity.UserRelative;

import java.time.Instant;

public record RelativeInvitationResponse(
        Long id,
        Long fromUserId,
        String fromUsername,
        Instant invitedAt
) {
    public static RelativeInvitationResponse from(UserRelative link) {
        return new RelativeInvitationResponse(
                link.getId(),
                link.getUser().getId(),
                link.getUser().getUsername(),
                link.getCreatedAt()
        );
    }
}
