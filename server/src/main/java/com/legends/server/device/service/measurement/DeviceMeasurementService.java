package com.legends.server.device.service.measurement;

import com.legends.server.device.dto.response.DeviceMeasurementResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMeasurement;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.event.DeviceMeasurementSavedEvent;
import com.legends.server.device.mqtt.message.DeviceMeasurementMessage;
import com.legends.server.device.repository.DeviceMeasurementRepository;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import com.legends.server.device.service.statistics.DeviceStatisticsService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class DeviceMeasurementService {

    private final DeviceRepository deviceRepository;
    private final DeviceMeasurementRepository measurementRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final DeviceStatisticsService statisticsService;

    public DeviceMeasurementService(
            DeviceRepository deviceRepository,
            DeviceMeasurementRepository measurementRepository,
            ApplicationEventPublisher eventPublisher,
            DeviceStatisticsService statisticsService
    ) {
        this.deviceRepository = deviceRepository;
        this.measurementRepository = measurementRepository;
        this.eventPublisher = eventPublisher;
        this.statisticsService = statisticsService;
    }

    @Transactional
    public void ingest(String deviceId, DeviceMeasurementMessage message) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));

        if (device.getStatus() != DeviceStatus.ACTIVE) {
            return;
        }

        Instant now = Instant.now();
        Instant measuredAt = message.ts() == null
                ? now
                : Instant.ofEpochMilli(message.ts());

        DeviceMeasurement measurement = new DeviceMeasurement();
        measurement.setDevice(device);
        measurement.setMeasuredAt(measuredAt);
        measurement.setReceivedAt(now);
        measurement.setAccelX(message.accelX());
        measurement.setAccelY(message.accelY());
        measurement.setAccelZ(message.accelZ());
        measurement.setGyroX(message.gyroX());
        measurement.setGyroY(message.gyroY());
        measurement.setGyroZ(message.gyroZ());
        measurement.setHeartRate(message.heartRate());
        measurement.setSpo2(message.spo2());
        measurementRepository.save(measurement);
        statisticsService.updateFromMeasurement(device, measurement);

        eventPublisher.publishEvent(new DeviceMeasurementSavedEvent(
                device.getDeviceId(),
                DeviceMeasurementResponse.from(measurement)
        ));
    }
}
