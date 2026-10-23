package com.legends.server.device.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DeviceMeasurementRequest(
        @NotBlank(message = "Device ID cannot be blank")
        String deviceId,

        Double accelX,
        Double accelY,
        Double accelZ,
        Double gyroX,
        Double gyroY,
        Double gyroZ,
        Integer heartRate,
        Double spo2
) {}