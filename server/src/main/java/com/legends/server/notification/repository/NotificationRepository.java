package com.legends.server.notification.repository;

import com.legends.server.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findAllByRecipientId(Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNull(Long recipientId);

    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    boolean existsByAiAnalysis_IdAndRecipient_Id(Long aiAnalysisId, Long recipientId);

    boolean existsByDevice_IdAndCreatedAtAfter(Long deviceId, Instant createdAt);
}
