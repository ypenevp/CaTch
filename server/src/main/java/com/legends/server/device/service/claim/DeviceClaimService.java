package com.legends.server.device.service.claim;

import com.legends.server.device.service.mqtt.MqttCredentialProvisioner;

import com.legends.server.device.dto.request.ClaimDeviceRequest;
import com.legends.server.device.dto.response.DeviceClaimResponse;
import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DevicePairing;
import com.legends.server.device.entity.DevicePairingStatus;
import com.legends.server.device.entity.DeviceStatus;
import com.legends.server.device.repository.DevicePairingRepository;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.device.util.DeviceSecretGenerator;
import com.legends.server.exception.custom.InvalidDeviceClaimException;
import com.legends.server.exception.custom.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class DeviceClaimService {

    private final DeviceRepository deviceRepository;
    private final DevicePairingRepository pairingRepository;
    private final MqttCredentialProvisioner credentialProvisioner;

    public DeviceClaimService(
            DeviceRepository deviceRepository,
            DevicePairingRepository pairingRepository,
            MqttCredentialProvisioner credentialProvisioner
    ) {
        this.deviceRepository = deviceRepository;
        this.pairingRepository = pairingRepository;
        this.credentialProvisioner = credentialProvisioner;
    }

    @Transactional
    public DeviceClaimResponse claim(ClaimDeviceRequest request) {
        Device device = deviceRepository.findByDeviceId(request.deviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        DevicePairing pairing = pairingRepository
                .findByPairingTokenHash(DeviceSecretGenerator.sha256(request.pairingToken()))
                .orElseThrow(() -> new ResourceNotFoundException("Pairing not found"));

        if (device.getStatus() != DeviceStatus.UNCLAIMED) {
            throw new InvalidDeviceClaimException(
                    "Device cannot be claimed because it is already claimed"
            );
        }

        if (pairing.getStatus() != DevicePairingStatus.PENDING) {
            throw new InvalidDeviceClaimException(
                    "Pairing request is no longer pending"
            );
        }

        if (pairing.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidDeviceClaimException(
                    "Pairing request has expired"
            );
        }

        if (!pairing.getDevice().getDeviceId().equals(request.deviceId())) {
            throw new InvalidDeviceClaimException(
                    "Pairing request does not belong to this device"
            );
        }

        if (!DeviceSecretGenerator.matches(request.claimSecret(), device.getClaimSecretHash())) {
            throw new InvalidDeviceClaimException(
                    "The claim secret is invalid"
            );
        }

        device.setOwner(pairing.getUser());
        device.setStatus(DeviceStatus.ACTIVE);
        device.setClaimedAt(Instant.now());
        pairing.setStatus(DevicePairingStatus.PAIRED);
        pairing.setPairedAt(Instant.now());

        MqttCredentialProvisioner.MqttCredentials credentials = credentialProvisioner.provision(device);

        return new DeviceClaimResponse(
                device.getDeviceId(),
                device.getStatus().name(),
                credentials.username(),
                credentials.password()
        );
    }
}
