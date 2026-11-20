package com.legends.server.config.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        @NotBlank String baseUrl,
        @Positive long analysisIntervalMs,
        @Positive int windowSize,
        @Positive int minNewMeasurements,
        @Positive int maxWindowSeconds,
        @Positive int connectTimeoutMs,
        @Positive int readTimeoutMs,
        @Positive int analysesRetentionCount
) {
}
