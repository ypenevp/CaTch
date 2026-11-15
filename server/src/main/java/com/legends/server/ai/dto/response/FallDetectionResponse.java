package com.legends.server.ai.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FallDetectionResponse(
        String activity,
        @JsonProperty("fall_detected") Boolean fallDetected,
        @JsonProperty("fall_probability") Double fallProbability,
        @JsonProperty("fall_assessment") FallAssessmentResponse fallAssessment
) {
}
