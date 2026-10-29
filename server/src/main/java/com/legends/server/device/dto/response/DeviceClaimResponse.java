package com.legends.server.device.dto.response;

public record DeviceClaimResponse(
        String deviceId,
        String status,
        String mqttUsername,
        String mqttPassword
) {
}
