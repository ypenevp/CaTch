package com.legends.server.notification.dto.request;

import com.legends.server.notification.entity.PushPlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterPushTokenRequest(
        @NotBlank
        @Size(max = 512)
        String token,

        @NotNull
        PushPlatform platform,

        @Size(max = 128)
        String deviceName
) {
}
