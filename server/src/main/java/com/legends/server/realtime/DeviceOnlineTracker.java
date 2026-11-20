package com.legends.server.realtime;

import com.legends.server.config.device.DeviceProperties;
import com.legends.server.device.event.DeviceMeasurementSavedEvent;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// publishes a status event when a device comes online and when it stops sending (same rule as DeviceResponse.online)
@Component
public class DeviceOnlineTracker {

    private static final long CHECK_INTERVAL_MS = 2_000;

    private final Map<String, Instant> lastSeenByDevice = new ConcurrentHashMap<>();
    private final DeviceEventPublisher publisher;
    private final DeviceProperties properties;

    public DeviceOnlineTracker(DeviceEventPublisher publisher, DeviceProperties properties) {
        this.publisher = publisher;
        this.properties = properties;
    }

    @TransactionalEventListener
    public void onMeasurementSaved(DeviceMeasurementSavedEvent event) {
        Instant receivedAt = event.measurement().receivedAt();
        if (lastSeenByDevice.put(event.deviceId(), receivedAt) == null) {
            publisher.publishStatus(event.deviceId(), true, receivedAt);
        }
    }

    @Scheduled(fixedDelay = CHECK_INTERVAL_MS)
    public void markOfflineDevices() {
        Instant threshold = Instant.now().minusSeconds(properties.onlineThresholdSeconds());
        lastSeenByDevice.forEach((deviceId, lastSeen) -> {
            if (lastSeen.isBefore(threshold) && lastSeenByDevice.remove(deviceId, lastSeen)) {
                publisher.publishStatus(deviceId, false, lastSeen);
            }
        });
    }
}
