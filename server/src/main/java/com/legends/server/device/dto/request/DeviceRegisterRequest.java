package com.legends.server.device.dto.request;

import jakarta.validation.constraints.NotBlank;

public record DeviceRegisterRequest(
        @NotBlank(message = "Device ID cannot be blank")
        String deviceCodeId
) {}