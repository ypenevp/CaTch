package com.legends.server.ai.service;

import com.legends.server.ai.dto.request.FallDetectionRequest;

import java.time.Instant;

public record AnalysisWindow(
        Long deviceId,
        FallDetectionRequest request,
        Integer heartRate,
        Instant windowStartAt,
        Instant windowEndAt,
        Long lastMeasurementId
) {
}
