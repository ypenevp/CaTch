package com.legends.server.device.repository;

import com.legends.server.auth.entity.User;
import com.legends.server.device.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import com.legends.server.device.entity.DeviceStatus;

public interface DeviceRepository extends JpaRepository<Device, Long> {

    Optional<Device> findByDeviceId(String deviceId);

    boolean existsByDeviceId(String deviceId);

    Page<Device> findAllByOwner(User owner, Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    Page<Device> findAllByOwnerIdIn(Collection<Long> ownerIds, Pageable pageable);

    Optional<Device> findByDeviceIdAndOwnerId(String deviceId, Long ownerId);

    List<Device> findAllByStatus(DeviceStatus status);
}
