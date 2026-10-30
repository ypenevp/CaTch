package com.legends.server.device.repository;

import com.legends.server.device.entity.DeviceMqttCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeviceMqttCredentialRepository extends JpaRepository<DeviceMqttCredential, Long> {

    Optional<DeviceMqttCredential> findByDeviceId(Long deviceId);
}
