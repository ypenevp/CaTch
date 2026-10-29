package com.legends.server.device.dto.response;

import com.legends.server.device.entity.Device;

import java.time.Instant;

public record DeviceResponse(
        Long id,
        String deviceId,
        String status,
        boolean online,
        Instant lastSeen
) {
    public static DeviceResponse from(
            Device device,
            Instant lastSeen,
            boolean online
    ) {
        return new DeviceResponse(
                device.getId(),
                device.getDeviceId(),
                device.getStatus().name(),
                online,
                lastSeen
        );
    }
}
