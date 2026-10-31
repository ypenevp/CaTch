package com.legends.server.relative.entity;

import com.legends.server.auth.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@Table(
        name = "user_relatives",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_user_relatives_user_relative",
                columnNames = {"user_id", "relative_id"}
        )
)
public class UserRelative {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // the user who sent the invitation and whose devices are shared
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // the invited user, who becomes a relative once the invitation is accepted
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "relative_id", nullable = false)
    private User relative;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRelativeStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = UserRelativeStatus.PENDING;
        }
    }
}
