package com.legends.server.device.service;

import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.config.device.DeviceProperties;
import com.legends.server.device.dto.response.DeviceMeasurementResponse;
import com.legends.server.device.dto.response.DeviceResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.repository.DeviceMeasurementRepository;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceMeasurementRepository measurementRepository;
    private final UserRepository userRepository;
    private final DeviceProperties properties;

    public DeviceService(
            DeviceRepository deviceRepository,
            DeviceMeasurementRepository measurementRepository,
            UserRepository userRepository,
            DeviceProperties properties
    ) {
        this.deviceRepository = deviceRepository;
        this.measurementRepository = measurementRepository;
        this.userRepository = userRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public Page<DeviceResponse> getMyDevices(Long userId, org.springframework.data.domain.Pageable pageable) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return deviceRepository.findAllByOwner(user, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public DeviceResponse getDevice(String deviceId, Long userId) {
        Device device = deviceRepository.findByDeviceIdAndOwnerId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        return toResponse(device);
    }

    @Transactional(readOnly = true)
    public Page<DeviceMeasurementResponse> getMeasurements(
            String deviceId,
            Long userId,
            int limit
    ) {
        Device device = deviceRepository.findByDeviceIdAndOwnerId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        int safeLimit = Math.min(Math.max(limit, 1), properties.measurementsRetentionCount());
        return measurementRepository.findAllByDeviceOrderByMeasuredAtDesc(
                        device,
                        PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "measuredAt"))
                )
                .map(DeviceMeasurementResponse::from);
    }

    @Transactional(readOnly = true)
    public DeviceMeasurementResponse getLatestMeasurement(String deviceId, Long userId) {
        Device device = deviceRepository.findByDeviceIdAndOwnerId(deviceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        return measurementRepository.findTopByDeviceOrderByMeasuredAtDesc(device)
                .map(DeviceMeasurementResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Measurement not found"));
    }

    private DeviceResponse toResponse(Device device) {
        Instant lastSeen = measurementRepository.findLatestReceivedAt(device).orElse(null);
        boolean online = lastSeen != null
                && lastSeen.isAfter(Instant.now().minusSeconds(properties.onlineThresholdSeconds()));
        return DeviceResponse.from(device, lastSeen, online);
    }
}
