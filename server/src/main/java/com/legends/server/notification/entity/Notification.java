package com.legends.server.notification.entity;

import com.legends.server.ai.entity.AiAnalysis;
import com.legends.server.auth.entity.User;
import com.legends.server.device.entity.Device;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_analysis_id", nullable = false)
    private AiAnalysis aiAnalysis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private NotificationType type;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(nullable = false, length = 512)
    private String message;

    @Column(name = "fall_probability")
    private Double fallProbability;

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "email_status", nullable = false, length = 32)
    private NotificationDeliveryStatus emailStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "push_status", nullable = false, length = 32)
    private NotificationDeliveryStatus pushStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "realtime_status", nullable = false, length = 32)
    private NotificationDeliveryStatus realtimeStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (emailStatus == null) {
            emailStatus = NotificationDeliveryStatus.PENDING;
        }
        if (pushStatus == null) {
            pushStatus = NotificationDeliveryStatus.PENDING;
        }
        if (realtimeStatus == null) {
            realtimeStatus = NotificationDeliveryStatus.PENDING;
        }
    }
}
