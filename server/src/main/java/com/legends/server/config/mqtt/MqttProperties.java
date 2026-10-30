package com.legends.server.config.mqtt;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "mqtt")
public record MqttProperties(
        @NotBlank String brokerUrl,
        @NotBlank String clientId,
        @NotBlank String username,
        @NotBlank String password
) {
}
