package com.legends.server.device.dto.response;

import com.legends.server.device.entity.DevicePairing;

import java.time.Instant;
import java.util.UUID;

public record DevicePairingResponse(
        UUID pairingId,
        String deviceId,
        String pairingToken,
        String status,
        Instant expiresAt
) {
    public static DevicePairingResponse created(DevicePairing pairing, String token) {
        return new DevicePairingResponse(
                pairing.getId(),
                pairing.getDevice().getDeviceId(),
                token,
                pairing.getStatus().name(),
                pairing.getExpiresAt()
        );
    }

    public static DevicePairingResponse from(DevicePairing pairing) {
        return new DevicePairingResponse(
                pairing.getId(),
                pairing.getDevice().getDeviceId(),
                null,
                pairing.getStatus().name(),
                pairing.getExpiresAt()
        );
    }
}
