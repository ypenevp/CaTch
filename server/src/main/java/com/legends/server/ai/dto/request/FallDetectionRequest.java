package com.legends.server.ai.dto.request;

import java.util.List;

public record FallDetectionRequest(
        List<FallDetectionRecord> records,
        Double bpm
) {
}
