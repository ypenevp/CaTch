package com.legends.server.notification.service;

import com.google.firebase.messaging.FirebaseMessagingException;
import com.legends.server.auth.service.EmailService;
import com.legends.server.exception.custom.EmailDeliveryException;
import com.legends.server.notification.entity.NotificationDeliveryStatus;
import com.legends.server.notification.repository.NotificationRepository;
import com.legends.server.notification.repository.UserPushTokenRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class NotificationDeliveryService {

    private final NotificationRepository notificationRepository;
    private final UserPushTokenRepository pushTokenRepository;
    private final EmailService emailService;
    private final FirebasePushService firebasePushService;

    public NotificationDeliveryService(
            NotificationRepository notificationRepository,
            UserPushTokenRepository pushTokenRepository,
            EmailService emailService,
            FirebasePushService firebasePushService
    ) {
        this.notificationRepository = notificationRepository;
        this.pushTokenRepository = pushTokenRepository;
        this.emailService = emailService;
        this.firebasePushService = firebasePushService;
    }

    @Async
    @Transactional
    public void deliverEmail(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            try {
                emailService.sendFallAlertEmail(
                        notification.getRecipient().getEmail(),
                        notification.getDevice().getDeviceId(),
                        notification.getFallProbability() == null ? 0.0 : notification.getFallProbability(),
                        notification.getDetectedAt()
                );
                notification.setEmailStatus(NotificationDeliveryStatus.SENT);
            } catch (EmailDeliveryException exception) {
                notification.setEmailStatus(NotificationDeliveryStatus.FAILED);
            }
        });
    }

    @Async
    @Transactional
    public void deliverPush(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (!firebasePushService.isConfigured()) {
                notification.setPushStatus(NotificationDeliveryStatus.SKIPPED);
                return;
            }

            Map<String, String> data = Map.of(
                    "type", "FALL_DETECTED",
                    "notificationId", String.valueOf(notification.getId()),
                    "deviceId", notification.getDevice().getDeviceId(),
                    "aiAnalysisId", String.valueOf(notification.getAiAnalysis().getId()),
                    "screen", "fall_details"
            );

            boolean sent = false;
            for (var pushToken : pushTokenRepository.findAllByUserIdAndActiveTrue(notification.getRecipient().getId())) {
                try {
                    firebasePushService.send(
                            pushToken.getToken(),
                            notification.getTitle(),
                            notification.getMessage(),
                            data
                    );
                    sent = true;
                } catch (FirebaseMessagingException | IllegalStateException exception) {
                    pushToken.setActive(false);
                }
            }

            notification.setPushStatus(sent
                    ? NotificationDeliveryStatus.SENT
                    : NotificationDeliveryStatus.FAILED);
        });
    }
}
