package com.legends.server.device.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ClaimDeviceRequest(
        @NotBlank
        String deviceId,

        @NotBlank
        String claimSecret,

        @NotBlank
        String pairingToken
) {
}
