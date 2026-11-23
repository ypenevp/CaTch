package com.legends.server.notification.service;

import com.legends.server.ai.dto.response.AiAnalysisResponse;
import com.legends.server.ai.entity.AiAnalysis;
import com.legends.server.ai.repository.AiAnalysisRepository;
import com.legends.server.auth.entity.User;
import com.legends.server.device.entity.Device;
import com.legends.server.device.repository.DeviceRepository;
import com.legends.server.exception.custom.ResourceNotFoundException;
import com.legends.server.notification.dto.response.NotificationResponse;
import com.legends.server.notification.dto.response.UnreadNotificationCountResponse;
import com.legends.server.notification.entity.Notification;
import com.legends.server.notification.entity.NotificationDeliveryStatus;
import com.legends.server.notification.entity.NotificationType;
import com.legends.server.notification.repository.NotificationRepository;
import com.legends.server.realtime.DeviceTopics;
import com.legends.server.relative.entity.UserRelativeStatus;
import com.legends.server.relative.repository.UserRelativeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final DeviceRepository deviceRepository;
    private final UserRelativeRepository userRelativeRepository;
    private final NotificationDeliveryService deliveryService;
    private final SimpMessagingTemplate messagingTemplate;
    private final double fallProbabilityThreshold;
    private final long cooldownSeconds;

    public NotificationService(
            NotificationRepository notificationRepository,
            AiAnalysisRepository aiAnalysisRepository,
            DeviceRepository deviceRepository,
            UserRelativeRepository userRelativeRepository,
            NotificationDeliveryService deliveryService,
            SimpMessagingTemplate messagingTemplate,
            @Value("${app.notification.fall-probability-threshold:0.75}") double fallProbabilityThreshold,
            @Value("${app.notification.cooldown-seconds:60}") long cooldownSeconds
    ) {
        this.notificationRepository = notificationRepository;
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.deviceRepository = deviceRepository;
        this.userRelativeRepository = userRelativeRepository;
        this.deliveryService = deliveryService;
        this.messagingTemplate = messagingTemplate;
        this.fallProbabilityThreshold = fallProbabilityThreshold;
        this.cooldownSeconds = cooldownSeconds;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onFallAnalysis(com.legends.server.ai.event.AiAnalysisSavedEvent event) {
        AiAnalysisResponse analysis = event.analysis();
        if (!analysis.fallDetected()
                || analysis.fallProbability() == null
                || analysis.fallProbability() < fallProbabilityThreshold) {
            return;
        }

        AiAnalysis aiAnalysis = aiAnalysisRepository.findById(analysis.id())
                .orElseThrow(() -> new ResourceNotFoundException("AI analysis not found"));
        Device device = deviceRepository.findByDeviceId(analysis.deviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Device not found"));
        if (device.getOwner() == null) {
            return;
        }

        Instant cooldownStart = Instant.now().minusSeconds(cooldownSeconds);
        if (notificationRepository.existsByDevice_IdAndCreatedAtAfter(device.getId(), cooldownStart)) {
            return;
        }

        Set<User> recipients = new LinkedHashSet<>();
        if (device.getOwner() != null) {
            recipients.add(device.getOwner());
        }
        userRelativeRepository
                .findAllByUserIdAndStatus(device.getOwner().getId(), UserRelativeStatus.ACCEPTED)
                .forEach(link -> recipients.add(link.getRelative()));

        List<Long> createdIds = new ArrayList<>();
        for (User recipient : recipients) {
            if (notificationRepository.existsByAiAnalysis_IdAndRecipient_Id(aiAnalysis.getId(), recipient.getId())) {
                continue;
            }

            Notification notification = new Notification();
            notification.setRecipient(recipient);
            notification.setDevice(device);
            notification.setAiAnalysis(aiAnalysis);
            notification.setType(NotificationType.FALL_DETECTED);
            notification.setTitle("Possible fall detected");
            notification.setMessage("Possible fall detected for " + device.getDeviceId());
            notification.setFallProbability(analysis.fallProbability());
            notification.setDetectedAt(aiAnalysis.getAnalyzedAt());

            Notification saved = notificationRepository.save(notification);

            NotificationResponse response = NotificationResponse.from(saved);
            try {
                messagingTemplate.convertAndSend(
                        DeviceTopics.userNotifications(recipient.getId()),
                        response
                );
                saved.setRealtimeStatus(NotificationDeliveryStatus.SENT);
            } catch (MessagingException exception) {
                saved.setRealtimeStatus(NotificationDeliveryStatus.FAILED);
            }

            createdIds.add(saved.getId());
        }

        deliverAfterCommit(createdIds);
    }

    private void deliverAfterCommit(List<Long> notificationIds) {
        if (notificationIds.isEmpty()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (Long notificationId : notificationIds) {
                    deliveryService.deliverEmail(notificationId);
                    deliveryService.deliverPush(notificationId);
                }
            }
        });
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findAllByRecipientId(userId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public UnreadNotificationCountResponse getUnreadCount(Long userId) {
        return new UnreadNotificationCountResponse(
                notificationRepository.countByRecipientIdAndReadAtIsNull(userId)
        );
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
        }
        return NotificationResponse.from(notification);
    }
}
