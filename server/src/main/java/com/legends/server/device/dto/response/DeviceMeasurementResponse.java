package com.legends.server.device.dto.response;

import com.legends.server.device.entity.DeviceMeasurement;

import java.time.Instant;

public record DeviceMeasurementResponse(
        Instant measuredAt,
        Instant receivedAt,
        Double accelX,
        Double accelY,
        Double accelZ,
        Double gyroX,
        Double gyroY,
        Double gyroZ,
        Integer heartRate,
        Double spo2
) {
    public static DeviceMeasurementResponse from(DeviceMeasurement measurement) {
        return new DeviceMeasurementResponse(
                measurement.getMeasuredAt(),
                measurement.getReceivedAt(),
                measurement.getAccelX(),
                measurement.getAccelY(),
                measurement.getAccelZ(),
                measurement.getGyroX(),
                measurement.getGyroY(),
                measurement.getGyroZ(),
                measurement.getHeartRate(),
                measurement.getSpo2()
        );
    }
}
