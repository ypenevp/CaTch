package com.legends.server.device.service;

import com.legends.server.device.entity.Device;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.relative.entity.UserRelativeStatus;
import com.legends.server.relative.repository.UserRelativeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DeviceAccessService {

    private final DeviceRepository deviceRepository;
    private final UserRelativeRepository userRelativeRepository;

    public DeviceAccessService(DeviceRepository deviceRepository, UserRelativeRepository userRelativeRepository) {
        this.deviceRepository = deviceRepository;
        this.userRelativeRepository = userRelativeRepository;
    }

    // the owner and relatives with an accepted link can see the device
    @Transactional(readOnly = true)
    public boolean canView(String deviceId, Long userId) {
        return deviceRepository.findByDeviceId(deviceId)
                .map(Device::getOwner)
                .map(owner -> owner.getId().equals(userId)
                        || userRelativeRepository.existsByUserIdAndRelativeIdAndStatus(
                                owner.getId(), userId, UserRelativeStatus.ACCEPTED))
                .orElse(false);
    }
}
