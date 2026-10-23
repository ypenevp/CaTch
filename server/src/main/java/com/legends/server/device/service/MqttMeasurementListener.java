package com.legends.server.device.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.legends.server.device.dto.request.DeviceMeasurementRequest;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MqttMeasurementListener {

    private static final Logger log = LoggerFactory.getLogger(MqttMeasurementListener.class);
    private static final Pattern MEASUREMENT_TOPIC =
            Pattern.compile("^devices/([^/]+)/measurements$");

    private final ObjectMapper objectMapper;
    private final DeviceMeasurementService measurementService;

    public MqttMeasurementListener(
            ObjectMapper objectMapper,
            DeviceMeasurementService measurementService
    ) {
        this.objectMapper = objectMapper;
        this.measurementService = measurementService;
    }

    @org.springframework.integration.annotation.ServiceActivator(inputChannel = "mqttInputChannel")
    public void handle(Message<String> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        Matcher matcher = topic == null ? null : MEASUREMENT_TOPIC.matcher(topic);

        if (matcher == null || !matcher.matches()) {
            log.warn("Ignoring MQTT message from unsupported topic: {}", topic);
            return;
        }

        String deviceId = matcher.group(1);

        try {
            DeviceMeasurementRequest request =
                    objectMapper.readValue(message.getPayload(), DeviceMeasurementRequest.class);
            measurementService.saveMeasurement(deviceId, request);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            log.error("Invalid MQTT measurement payload for device {}", deviceId, exception);
        } catch (ResourceNotFoundException exception) {
            log.error("Failed to process MQTT measurement for device {}", deviceId, exception);
        }
    }
}
