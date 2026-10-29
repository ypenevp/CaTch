package com.legends.server.device.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterFactoryDeviceRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9_-]{8,64}$")
        String deviceId,

        @NotBlank
        @Size(min = 16, max = 256)
        String claimSecret
) {
}
