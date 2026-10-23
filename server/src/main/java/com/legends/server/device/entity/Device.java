package com.legends.server.device.entity;

import com.legends.server.auth.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.Date;

@Entity
@Getter
@Setter
@Table(name = "devices")
public class Device {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "device_id", nullable = false, unique = true)
    private String deviceId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "is_activated", nullable = false)
    private boolean isActivated;

    @Column(name = "activated_on")
    private Date activatedOn;

    @Column(name = "last_seen")
    private Instant lastSeen;

    @PrePersist
    public void onCreate() {
        this.isActivated = false;
    }
}
