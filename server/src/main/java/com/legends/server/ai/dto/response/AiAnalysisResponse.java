package com.legends.server.ai.dto.response;

import com.legends.server.ai.entity.AiAnalysis;

import java.time.Instant;

public record AiAnalysisResponse(
        Long id,
        String deviceId,
        String activity,
        boolean fallDetected,
        Double fallProbability,
        String fallCause,
        String fallReason,
        Integer heartRate,
        Instant windowStartAt,
        Instant windowEndAt,
        Instant analyzedAt
) {
    public static AiAnalysisResponse from(AiAnalysis analysis) {
        return new AiAnalysisResponse(
                analysis.getId(),
                analysis.getDevice().getDeviceId(),
                analysis.getActivity(),
                analysis.isFallDetected(),
                analysis.getFallProbability(),
                analysis.getFallCause(),
                analysis.getFallReason(),
                analysis.getHeartRate(),
                analysis.getWindowStartAt(),
                analysis.getWindowEndAt(),
                analysis.getAnalyzedAt()
        );
    }
}
