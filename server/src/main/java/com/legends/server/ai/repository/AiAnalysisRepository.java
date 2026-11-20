package com.legends.server.ai.repository;

import com.legends.server.ai.entity.AiAnalysis;
import com.legends.server.device.entity.Device;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, Long> {

    Optional<AiAnalysis> findTopByDeviceOrderByIdDesc(Device device);

    Page<AiAnalysis> findAllByDevice(Device device, Pageable pageable);

    Page<AiAnalysis> findAllByDeviceAndFallDetectedTrue(Device device, Pageable pageable);

    @Modifying
    @Query(value = """
            DELETE FROM ai_analyses
            WHERE device_id = :deviceId
              AND fall_detected = FALSE
              AND id NOT IN (
                  SELECT id FROM ai_analyses
                  WHERE device_id = :deviceId
                    AND fall_detected = FALSE
                  ORDER BY id DESC
                  LIMIT :retentionCount
              )
            """, nativeQuery = true)
    int deleteOlderThanRetention(
            @Param("deviceId") Long deviceId,
            @Param("retentionCount") int retentionCount
    );
}
