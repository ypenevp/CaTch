package com.legends.server.realtime.dto;

import com.legends.server.ai.dto.response.AiAnalysisResponse;
import com.legends.server.device.dto.response.DeviceMeasurementResponse;

public record DeviceEventMessage(
        String type,
        Object data
) {
    public static DeviceEventMessage measurement(DeviceMeasurementResponse measurement) {
        return new DeviceEventMessage("measurement", measurement);
    }

    public static DeviceEventMessage analysis(AiAnalysisResponse analysis) {
        return new DeviceEventMessage("analysis", analysis);
    }

    public static DeviceEventMessage status(DeviceStatusMessage status) {
        return new DeviceEventMessage("status", status);
    }
}
