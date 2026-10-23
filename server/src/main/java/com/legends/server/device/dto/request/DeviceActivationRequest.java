package com.legends.server.device.dto.request;

import jakarta.validation.constraints.NotNull;

public record DeviceActivationRequest(
        @NotNull
        String deviceCodeId
) {
}
