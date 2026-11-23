package com.legends.server.notification.controller;

import com.legends.server.notification.dto.request.RegisterPushTokenRequest;
import com.legends.server.notification.dto.request.RemovePushTokenRequest;
import com.legends.server.notification.dto.response.NotificationResponse;
import com.legends.server.notification.dto.response.UnreadNotificationCountResponse;
import com.legends.server.notification.service.NotificationService;
import com.legends.server.notification.service.UserPushTokenService;
import com.legends.server.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserPushTokenService pushTokenService;

    public NotificationController(
            NotificationService notificationService,
            UserPushTokenService pushTokenService
    ) {
        this.notificationService = notificationService;
        this.pushTokenService = pushTokenService;
    }

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @CurrentUser Long userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(notificationService.getNotifications(userId, pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadNotificationCountResponse> getUnreadCount(@CurrentUser Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long notificationId,
            @CurrentUser Long userId
    ) {
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, userId));
    }

    @PostMapping("/push-tokens")
    public ResponseEntity<Void> registerPushToken(
            @Valid @RequestBody RegisterPushTokenRequest request,
            @CurrentUser Long userId
    ) {
        pushTokenService.register(request, userId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @DeleteMapping("/push-tokens")
    public ResponseEntity<Void> removePushToken(
            @Valid @RequestBody RemovePushTokenRequest request,
            @CurrentUser Long userId
    ) {
        pushTokenService.remove(request, userId);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
