package com.legends.server.device.repository;

import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DevicePairing;
import com.legends.server.device.entity.DevicePairingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DevicePairingRepository extends JpaRepository<DevicePairing, UUID> {
    Optional<DevicePairing> findByPairingTokenHash(String pairingTokenHash);

    List<DevicePairing> findAllByDeviceAndStatus(
            Device device,
            DevicePairingStatus status
    );
}
