package com.legends.server.device.event;

import com.legends.server.device.dto.response.DeviceMeasurementResponse;

public record DeviceMeasurementSavedEvent(
        String deviceId,
        DeviceMeasurementResponse measurement
) {
}
