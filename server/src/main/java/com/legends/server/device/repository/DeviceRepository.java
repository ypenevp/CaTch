package com.legends.server.device.repository;

import com.legends.server.auth.entity.User;
import com.legends.server.device.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByDeviceId(String deviceId);

    Page<Device> findAllByUser(User user, Pageable pageable);
    Optional<Device> findByDeviceIdAndUserId(String deviceId, Long userId);
    boolean existsByDeviceId(String deviceId);
}
