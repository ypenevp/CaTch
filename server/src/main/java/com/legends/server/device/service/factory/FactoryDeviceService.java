package com.legends.server.device.service.factory;

import com.legends.server.device.dto.request.RegisterFactoryDeviceRequest;
import com.legends.server.device.dto.response.FactoryDeviceResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.device.util.DeviceSecretGenerator;
import com.legends.server.exception.custom.DuplicateResourceException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FactoryDeviceService {

    private final DeviceRepository deviceRepository;

    public FactoryDeviceService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @Transactional
    public FactoryDeviceResponse register(RegisterFactoryDeviceRequest request) {
        if (deviceRepository.existsByDeviceId(request.deviceId())) {
            throw new DuplicateResourceException("Device with this ID already exists");
        }

        Device device = new Device();
        device.setDeviceId(request.deviceId());
        device.setClaimSecretHash(DeviceSecretGenerator.sha256(request.claimSecret()));
        device.setStatus(DeviceStatus.UNCLAIMED);

        return FactoryDeviceResponse.from(deviceRepository.save(device));
    }
}
