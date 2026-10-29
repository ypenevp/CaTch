package com.legends.server.device.service.pairing;

import com.legends.server.auth.entity.User;
import com.legends.server.auth.repository.UserRepository;
import com.legends.server.config.device.DeviceProperties;
import com.legends.server.device.dto.request.CreateDevicePairingRequest;
import com.legends.server.device.dto.response.DevicePairingResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DevicePairing;
import com.legends.server.device.entity.DevicePairingStatus;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.device.repository.DevicePairingRepository;
import com.legends.server.device.util.DeviceSecretGenerator;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class DevicePairingService {

    private final DevicePairingRepository pairingRepository;
    private final DeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final DeviceProperties properties;

    public DevicePairingService(
            DevicePairingRepository pairingRepository,
            DeviceRepository deviceRepository,
            UserRepository userRepository,
            DeviceProperties properties
    ) {
        this.pairingRepository = pairingRepository;
        this.deviceRepository = deviceRepository;
        this.userRepository = userRepository;
        this.properties = properties;
    }

    @Transactional
    public DevicePairingResponse create(
            CreateDevicePairingRequest request,
            Long userId
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Device device = deviceRepository.findByDeviceId(request.deviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));

        if (device.getStatus() != DeviceStatus.UNCLAIMED) {
            throw new ResourceNotFoundException("Device is not available for pairing");
        }

        String token = DeviceSecretGenerator.generateToken(32);
        DevicePairing pairing = new DevicePairing();
        pairing.setUser(user);
        pairing.setDevice(device);
        pairing.setPairingTokenHash(DeviceSecretGenerator.sha256(token));
        pairing.setStatus(DevicePairingStatus.PENDING);
        pairing.setCreatedAt(Instant.now());
        pairing.setExpiresAt(Instant.now().plus(properties.pairingExpirationMinutes(), ChronoUnit.MINUTES));

        return DevicePairingResponse.created(pairingRepository.save(pairing), token);
    }

    @Transactional(readOnly = true)
    public DevicePairingResponse get(UUID pairingId, Long userId) {
        DevicePairing pairing = findForUser(pairingId, userId);
        return DevicePairingResponse.from(pairing);
    }

    @Transactional
    public void cancel(UUID pairingId, Long userId) {
        DevicePairing pairing = findForUser(pairingId, userId);
        if (pairing.getStatus() == DevicePairingStatus.PENDING) {
            pairing.setStatus(DevicePairingStatus.CANCELLED);
        }
    }

    private DevicePairing findForUser(UUID pairingId, Long userId) {
        DevicePairing pairing = pairingRepository.findById(pairingId)
                .orElseThrow(() -> new ResourceNotFoundException("Pairing not found"));
        if (!pairing.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Pairing not found");
        }
        return pairing;
    }
}
