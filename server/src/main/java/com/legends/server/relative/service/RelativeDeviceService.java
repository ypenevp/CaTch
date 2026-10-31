package com.legends.server.relative.service;

import com.legends.server.device.dto.response.DeviceMeasurementResponse;
import com.legends.server.device.dto.response.DeviceResponse;
import com.legends.server.device.dto.response.OwnedDeviceResponse;
import com.legends.server.device.service.DeviceService;
import com.legends.server.exception.custom.ResourceNotFoundException;
import com.legends.server.relative.entity.UserRelativeStatus;
import com.legends.server.relative.repository.UserRelativeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RelativeDeviceService {

    private final UserRelativeRepository userRelativeRepository;
    private final DeviceService deviceService;

    public RelativeDeviceService(
            UserRelativeRepository userRelativeRepository,
            DeviceService deviceService
    ) {
        this.userRelativeRepository = userRelativeRepository;
        this.deviceService = deviceService;
    }

    @Transactional(readOnly = true)
    public Page<OwnedDeviceResponse> getAllDevices(Long relativeId, Pageable pageable) {
        List<Long> userIds = userRelativeRepository.findUserIdsByRelativeIdAndStatus(relativeId, UserRelativeStatus.ACCEPTED);
        return deviceService.getDevicesOfOwners(userIds, pageable);
    }

    @Transactional(readOnly = true)
    public Page<DeviceResponse> getUserDevices(Long userId, Long relativeId, Pageable pageable) {
        ensureLinked(userId, relativeId);
        return deviceService.getMyDevices(userId, pageable);
    }

    @Transactional(readOnly = true)
    public DeviceResponse getUserDevice(Long userId, String deviceId, Long relativeId) {
        ensureLinked(userId, relativeId);
        return deviceService.getDevice(deviceId, userId);
    }

    @Transactional(readOnly = true)
    public DeviceMeasurementResponse getLatestMeasurement(Long userId, String deviceId, Long relativeId) {
        ensureLinked(userId, relativeId);
        return deviceService.getLatestMeasurement(deviceId, userId);
    }

    @Transactional(readOnly = true)
    public Page<DeviceMeasurementResponse> getMeasurements(Long userId, String deviceId, Long relativeId, int limit) {
        ensureLinked(userId, relativeId);
        return deviceService.getMeasurements(deviceId, userId, limit);
    }

    // a relative without an accepted link gets the same response as for a missing user, so linked accounts are not exposed
    private void ensureLinked(Long userId, Long relativeId) {
        if (!userRelativeRepository.existsByUserIdAndRelativeIdAndStatus(userId, relativeId, UserRelativeStatus.ACCEPTED)) {
            throw new ResourceNotFoundException("User not found");
        }
    }
}
