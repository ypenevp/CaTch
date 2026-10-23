package com.legends.server.device.dto.response;

import com.legends.server.device.entity.Device;
import java.time.Instant;
import java.util.Date;

public record DeviceResponse(
        Long id,
        String deviceId,
        boolean isActivated,
        Date activatedOn,
        Instant lastSeen
) {
    public static DeviceResponse from(Device device) {
        return new DeviceResponse(
                device.getId(),
                device.getDeviceId(),
                device.isActivated(),
                device.getActivatedOn(),
                device.getLastSeen()
        );
    }
}