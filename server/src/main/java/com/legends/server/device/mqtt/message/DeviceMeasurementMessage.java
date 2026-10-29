package com.legends.server.device.mqtt.message;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DeviceMeasurementMessage(
        Long ts,
        Double accelX,
        Double accelY,
        Double accelZ,
        Double gyroX,
        Double gyroY,
        Double gyroZ,
        Integer heartRate,
        Double spo2
) {
}
