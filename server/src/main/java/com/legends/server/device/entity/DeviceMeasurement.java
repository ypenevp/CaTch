package com.legends.server.device.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Date;

@Entity
@Getter
@Setter
@Table(name = "device_measurements")
public class DeviceMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    // MPU6050
    @Column(name = "accel_x")
    private Double accelX;

    @Column(name = "accel_y")
    private Double accelY;

    @Column(name = "accel_z")
    private Double accelZ;

    @Column(name = "gyro_x")
    private Double gyroX;

    @Column(name = "gyro_y")
    private Double gyroY;

    @Column(name = "gyro_z")
    private Double gyroZ;

    // MAX30102
    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "spo2")
    private Double spo2;

    @Column(name = "recorded_at", nullable = false)

    private Instant recordedAt;

    @PrePersist
    public void onCreate() {
        this.recordedAt = Instant.now();
    }
}