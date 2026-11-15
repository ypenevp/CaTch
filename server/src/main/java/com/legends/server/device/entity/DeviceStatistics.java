package com.legends.server.device.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(
        name = "device_statistics",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_device_statistics_device_bucket",
                columnNames = {"device_id", "bucket_start"}
        )
)
public class DeviceStatistics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "bucket_start", nullable = false)
    private Instant bucketStart;

    @Column(name = "heart_rate_min")
    private Integer heartRateMin;

    @Column(name = "heart_rate_max")
    private Integer heartRateMax;

    @Column(name = "heart_rate_sum")
    private Long heartRateSum;

    @Column(name = "heart_rate_sample_count", nullable = false)
    private int heartRateSampleCount;

    @Column(name = "spo2_min")
    private Double spo2Min;

    @Column(name = "spo2_max")
    private Double spo2Max;

    @Column(name = "spo2_sum")
    private Double spo2Sum;

    @Column(name = "spo2_sample_count", nullable = false)
    private int spo2SampleCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
