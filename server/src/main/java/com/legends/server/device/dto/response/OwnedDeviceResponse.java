package com.legends.server.device.dto.response;

import com.legends.server.device.entity.Device;

public record OwnedDeviceResponse(
        Long ownerId,
        String ownerUsername,
        DeviceResponse device
) {
    public static OwnedDeviceResponse from(Device device, DeviceResponse response) {
        return new OwnedDeviceResponse(
                device.getOwner().getId(),
                device.getOwner().getUsername(),
                response
        );
    }
}
