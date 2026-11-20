package com.legends.server.ai.entity;

import com.legends.server.device.entity.Device;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(name = "ai_analyses")
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false, length = 64)
    private String activity;

    @Column(name = "fall_detected", nullable = false)
    private boolean fallDetected;

    @Column(name = "fall_probability", nullable = false)
    private Double fallProbability;

    @Column(name = "fall_cause", length = 64)
    private String fallCause;

    @Column(name = "fall_reason")
    private String fallReason;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "window_start_at", nullable = false)
    private Instant windowStartAt;

    @Column(name = "window_end_at", nullable = false)
    private Instant windowEndAt;

    @Column(name = "last_measurement_id", nullable = false)
    private Long lastMeasurementId;

    @Column(name = "analyzed_at", nullable = false)
    private Instant analyzedAt;

    @PrePersist
    public void onCreate() {
        if (analyzedAt == null) {
            analyzedAt = Instant.now();
        }
    }
}
