package com.legends.server.device.service;

import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.device.dto.request.DeviceRegisterRequest;
import com.legends.server.device.dto.response.DeviceResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.repository.DeviceMeasurementRepository;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.exception.custom.DuplicateResourceException;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;


@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final DeviceMeasurementRepository  deviceMeasurementRepository;
    private final UserRepository userRepository;

    public DeviceService(DeviceRepository deviceRepository,  UserRepository userRepository,  DeviceMeasurementRepository deviceMeasurementRepository) {
        this.deviceRepository = deviceRepository;
        this.deviceMeasurementRepository = deviceMeasurementRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public DeviceResponse registerDevice(DeviceRegisterRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (deviceRepository.existsByDeviceId(request.deviceCodeId())) {
            throw new DuplicateResourceException("Device with this ID already exists");
        }

        Device device = new Device();
        device.setDeviceId(request.deviceCodeId());
        device.setUser(user);

        Device savedDevice = deviceRepository.save(device);
        return DeviceResponse.from(savedDevice);
    }

    @Transactional
    public void activateDevice(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));

        device.setActivated(true);
        device.setActivatedOn(Date.from(Instant.now()));
        device.setLastSeen(Instant.now());
        deviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public DeviceResponse getDevice(String deviceId, Long currentUserId) {
        Device device = deviceRepository.findByDeviceIdAndUserId(deviceId, currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));

        return DeviceResponse.from(device);
    }

    @Transactional(readOnly = true)
    public Page<DeviceResponse> getMyDevices(Long currentUserId, Pageable pageable) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Page<Device> devices = deviceRepository.findAllByUser(user, pageable);

        return devices.map(DeviceResponse::from);
    }



}
