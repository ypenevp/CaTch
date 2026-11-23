package com.legends.server.notification.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RemovePushTokenRequest(
        @NotBlank
        String token
) {
}
