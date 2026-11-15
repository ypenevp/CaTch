package com.legends.server.device.repository;

import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface DeviceStatisticsRepository extends JpaRepository<DeviceStatistics, Long> {

    Optional<DeviceStatistics> findByDeviceAndBucketStart(Device device, Instant bucketStart);

    List<DeviceStatistics> findAllByDeviceAndBucketStartBetweenOrderByBucketStartAsc(
            Device device,
            Instant from,
            Instant to
    );

    @Modifying
    @Query("""
            delete from DeviceStatistics statistics
            where statistics.bucketStart < :cutoff
            """)
    int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
