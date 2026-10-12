package com.legends.server.auth.dto.response;

import com.legends.server.auth.entity.User;

public record UserDetailsResponse(
        Long id,
        String username,
        String email,
        boolean active
) {

    public static  UserDetailsResponse from(User u) {
        return new UserDetailsResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.isActive()
        );
    }
}
