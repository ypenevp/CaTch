package com.legends.server.device.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(name = "device_mqtt_credentials")
public class DeviceMqttCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    @Column(nullable = false, unique = true, length = 128)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 64)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DeviceMqttCredentialStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = DeviceMqttCredentialStatus.ACTIVE;
        }
    }
}
