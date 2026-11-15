package com.legends.server.ai.dto.request;

import com.legends.server.device.entity.DeviceMeasurement;

public record FallDetectionRecord(
        Double ax,
        Double ay,
        Double az,
        Double droll,
        Double dpitch,
        Double dyaw
) {
    public static FallDetectionRecord from(DeviceMeasurement measurement) {
        return new FallDetectionRecord(
                measurement.getAccelX(),
                measurement.getAccelY(),
                measurement.getAccelZ(),
                measurement.getGyroX(),
                measurement.getGyroY(),
                measurement.getGyroZ()
        );
    }
}
