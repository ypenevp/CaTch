package com.legends.server.device.service.mqtt;

import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

@Component
public class MqttMessageRouter {

    private final MqttMeasurementListener measurementListener;
    public MqttMessageRouter(MqttMeasurementListener measurementListener) {
        this.measurementListener = measurementListener;
    }

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void route(Message<String> message) {
        String topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC, String.class);
        if (topic != null && topic.endsWith("/measurements")) {
            measurementListener.handle(message);
        }
    }
}
