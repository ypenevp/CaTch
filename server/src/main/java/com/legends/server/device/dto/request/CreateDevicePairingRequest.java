package com.legends.server.device.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateDevicePairingRequest(
        @NotBlank
        @Pattern(regexp = "^[A-Za-z0-9_-]{8,64}$")
        String deviceId
) {
}
