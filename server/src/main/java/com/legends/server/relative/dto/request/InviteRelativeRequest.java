package com.legends.server.relative.dto.request;

import jakarta.validation.constraints.NotBlank;

public record InviteRelativeRequest(
        @NotBlank
        String username
) {
}
