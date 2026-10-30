package com.legends.server.device.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(name = "device_measurements")
public class DeviceMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "measured_at", nullable = false)
    private Instant measuredAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

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

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "spo2")
    private Double spo2;
}
