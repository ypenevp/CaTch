package com.legends.server.relative.dto.response;

import com.legends.server.relative.entity.UserRelative;
import com.legends.server.relative.entity.UserRelativeStatus;

import java.time.Instant;

public record RelativeResponse(
        Long id,
        String username,
        UserRelativeStatus status,
        Instant invitedAt,
        Instant acceptedAt
) {
    public static RelativeResponse from(UserRelative link) {
        return new RelativeResponse(
                link.getRelative().getId(),
                link.getRelative().getUsername(),
                link.getStatus(),
                link.getCreatedAt(),
                link.getAcceptedAt()
        );
    }
}
