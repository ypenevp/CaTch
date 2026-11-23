package com.legends.server.notification.dto.response;

import com.legends.server.notification.entity.Notification;
import com.legends.server.notification.entity.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String message,
        String deviceId,
        Long aiAnalysisId,
        Double fallProbability,
        Instant detectedAt,
        Instant readAt,
        Instant createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getDevice().getDeviceId(),
                notification.getAiAnalysis().getId(),
                notification.getFallProbability(),
                notification.getDetectedAt(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
