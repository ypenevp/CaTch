package com.legends.server.device.service.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.legends.server.device.mqtt.message.DeviceMeasurementMessage;
import com.legends.server.device.service.measurement.DeviceMeasurementService;
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
            Pattern.compile("^devices/([A-Za-z0-9_-]{8,64})/measurements$");

    private final ObjectMapper objectMapper;
    private final DeviceMeasurementService measurementService;

    public MqttMeasurementListener(
            ObjectMapper objectMapper,
            DeviceMeasurementService measurementService
    ) {
        this.objectMapper = objectMapper;
        this.measurementService = measurementService;
    }

    public void handle(Message<String> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        Matcher matcher = topic == null ? null : MEASUREMENT_TOPIC.matcher(topic);
        if (matcher == null || !matcher.matches()) {
            log.warn("Ignoring unsupported MQTT topic");
            return;
        }

        try {
            measurementService.ingest(
                    matcher.group(1),
                    objectMapper.readValue(message.getPayload(), DeviceMeasurementMessage.class)
            );
        } catch (Exception exception) {
            log.error("Failed to process MQTT measurement", exception);
        }
    }
}
