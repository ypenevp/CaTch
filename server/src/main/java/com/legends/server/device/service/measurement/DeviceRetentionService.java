package com.legends.server.device.service.measurement;

import com.legends.server.config.device.DeviceProperties;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DeviceMeasurementRepository;
import com.legends.server.device.repository.DeviceRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeviceRetentionService {

    private final DeviceRepository deviceRepository;
    private final DeviceMeasurementRepository measurementRepository;
    private final DeviceProperties properties;

    public DeviceRetentionService(
            DeviceRepository deviceRepository,
            DeviceMeasurementRepository measurementRepository,
            DeviceProperties properties
    ) {
        this.deviceRepository = deviceRepository;
        this.measurementRepository = measurementRepository;
        this.properties = properties;
    }

    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void deleteMeasurementsOutsideRetentionWindow() {
        for (Device device : deviceRepository.findAllByStatus(DeviceStatus.ACTIVE)) {
            measurementRepository.deleteOlderThanRetention(
                    device.getId(),
                    properties.measurementsRetentionCount()
            );
        }
    }
}
