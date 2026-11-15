package com.legends.server.realtime;

import com.legends.server.ai.event.AiAnalysisSavedEvent;
import com.legends.server.device.event.DeviceMeasurementSavedEvent;
import com.legends.server.realtime.dto.DeviceEventMessage;
import com.legends.server.realtime.dto.DeviceStatusMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

@Component
public class DeviceEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(DeviceEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public DeviceEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener
    public void onMeasurementSaved(DeviceMeasurementSavedEvent event) {
        publish(event.deviceId(), DeviceEventMessage.measurement(event.measurement()));
    }

    @TransactionalEventListener
    public void onAnalysisSaved(AiAnalysisSavedEvent event) {
        publish(event.analysis().deviceId(), DeviceEventMessage.analysis(event.analysis()));
    }

    public void publishStatus(String deviceId, boolean online, Instant lastSeen) {
        publish(deviceId, DeviceEventMessage.status(new DeviceStatusMessage(deviceId, online, lastSeen)));
    }

    private void publish(String deviceId, DeviceEventMessage message) {
        try {
            messagingTemplate.convertAndSend(DeviceTopics.device(deviceId), message);
        } catch (MessagingException exception) {
            log.warn("Failed to publish {} event for device {}", message.type(), deviceId, exception);
        }
    }
}
