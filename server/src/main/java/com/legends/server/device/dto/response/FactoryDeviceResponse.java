package com.legends.server.device.dto.response;

import com.legends.server.device.entity.Device;

public record FactoryDeviceResponse(
        Long id,
        String deviceId,
        String status
) {
    public static FactoryDeviceResponse from(Device device) {
        return new FactoryDeviceResponse(
                device.getId(),
                device.getDeviceId(),
                device.getStatus().name()
        );
    }
}
