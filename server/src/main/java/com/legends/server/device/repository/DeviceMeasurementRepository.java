package com.legends.server.device.repository;

import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMeasurement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface DeviceMeasurementRepository extends JpaRepository<DeviceMeasurement, Long> {

    Optional<DeviceMeasurement> findTopByDeviceOrderByMeasuredAtDesc(Device device);

    Page<DeviceMeasurement> findAllByDeviceOrderByMeasuredAtDesc(Device device, Pageable pageable);

    @Modifying
    @Query(value = """
            DELETE FROM device_measurements
            WHERE device_id = :deviceId
              AND id NOT IN (
                  SELECT id FROM device_measurements
                  WHERE device_id = :deviceId
                  ORDER BY measured_at DESC
                  LIMIT :retentionCount
              )
            """, nativeQuery = true)
    int deleteOlderThanRetention(
            @Param("deviceId") Long deviceId,
            @Param("retentionCount") int retentionCount
    );

    @Query("""
            select max(m.receivedAt) from DeviceMeasurement m
            where m.device = :device
            """)
    Optional<Instant> findLatestReceivedAt(@Param("device") Device device);
}
