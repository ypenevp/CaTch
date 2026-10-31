package com.legends.server.relative.dto.response;

import com.legends.server.relative.entity.UserRelative;

import java.time.Instant;

public record LinkedUserResponse(
        Long id,
        String username,
        Instant acceptedAt
) {
    public static LinkedUserResponse from(UserRelative link) {
        return new LinkedUserResponse(
                link.getUser().getId(),
                link.getUser().getUsername(),
                link.getAcceptedAt()
        );
    }
}
