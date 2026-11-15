package com.legends.server.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FallAssessmentResponse(
        String cause,
        String reason,
        Double bpm
) {
}
