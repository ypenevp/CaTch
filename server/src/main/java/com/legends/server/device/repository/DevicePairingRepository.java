package com.legends.server.device.repository;

import com.legends.server.device.entity.DevicePairing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DevicePairingRepository extends JpaRepository<DevicePairing, UUID> {
    Optional<DevicePairing> findByPairingTokenHash(String pairingTokenHash);
}
