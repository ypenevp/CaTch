package com.legends.server.device.entity;

import com.legends.server.auth.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@Table(name = "device_pairings")
public class DevicePairing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id; // for more security

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "pairing_token_hash", nullable = false, unique = true, length = 64)
    private String pairingTokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DevicePairingStatus status;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "paired_at")
    private Instant pairedAt;
}
