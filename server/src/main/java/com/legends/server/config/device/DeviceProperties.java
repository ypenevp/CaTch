package com.legends.server.config.device;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.device")
public record DeviceProperties(
        @Positive int pairingExpirationMinutes,
        @Positive int measurementsRetentionCount,
        @Positive int maxClockDriftSeconds,
        @Positive int onlineThresholdSeconds
) {
}
