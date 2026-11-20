package com.legends.server.realtime.dto;

import java.time.Instant;

public record DeviceStatusMessage(
        String deviceId,
        boolean online,
        Instant lastSeen
) {
}
