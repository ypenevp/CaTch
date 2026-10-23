package com.legends.server.device.service;

import com.legends.server.device.dto.request.DeviceMeasurementRequest;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMeasurement;
import com.legends.server.device.repository.DeviceMeasurementRepository;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class DeviceMeasurementService {

    private static final int MAX_MEASUREMENTS_PER_DEVICE = 120;

    private final DeviceRepository deviceRepository;
    private final DeviceMeasurementRepository measurementRepository;

    public DeviceMeasurementService(
            DeviceRepository deviceRepository,
            DeviceMeasurementRepository measurementRepository
    ) {
        this.deviceRepository = deviceRepository;
        this.measurementRepository = measurementRepository;
    }

    @Transactional
    public void saveMeasurement(String deviceId, DeviceMeasurementRequest request) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));

        DeviceMeasurement measurement = new DeviceMeasurement();
        measurement.setDevice(device);
        measurement.setAccelX(request.accelX());
        measurement.setAccelY(request.accelY());
        measurement.setAccelZ(request.accelZ());
        measurement.setGyroX(request.gyroX());
        measurement.setGyroY(request.gyroY());
        measurement.setGyroZ(request.gyroZ());
        measurement.setHeartRate(request.heartRate());
        measurement.setSpo2(request.spo2());

        measurementRepository.save(measurement);
        device.setLastSeen(Instant.now());
        deviceRepository.save(device);

        List<DeviceMeasurement> latestMeasurements =
                measurementRepository.findTop120ByDeviceOrderByRecordedAtDescIdDesc(device);

        if (latestMeasurements.size() == MAX_MEASUREMENTS_PER_DEVICE) {
            List<Long> retainedIds = latestMeasurements.stream()
                    .map(DeviceMeasurement::getId)
                    .toList();
            measurementRepository.deleteByDeviceAndIdNotIn(device, retainedIds);
        }
    }
}
