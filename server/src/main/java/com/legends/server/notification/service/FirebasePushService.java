package com.legends.server.notification.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.AndroidNotification;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Map;

@Service
public class FirebasePushService {

    private static final Logger log = LoggerFactory.getLogger(FirebasePushService.class);

    private final String credentialsPath;
    private final String androidChannelId;

    public FirebasePushService(
            @Value("${app.firebase.credentials-path:}") String credentialsPath,
            @Value("${app.firebase.android-channel-id:fall-alerts}") String androidChannelId
    ) {
        this.credentialsPath = credentialsPath;
        this.androidChannelId = androidChannelId;
    }

    public boolean isConfigured() {
        return credentialsPath != null && !credentialsPath.isBlank();
    }

    public boolean isInvalidToken(FirebaseMessagingException exception) {
        MessagingErrorCode code = exception.getMessagingErrorCode();
        return code == MessagingErrorCode.UNREGISTERED
                || code == MessagingErrorCode.INVALID_ARGUMENT
                || code == MessagingErrorCode.SENDER_ID_MISMATCH;
    }

    public void send(
            String token,
            String title,
            String body,
            Map<String, String> data
    ) throws FirebaseMessagingException {
        initialize();

        Message message = Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build())
                .putAllData(data)
                .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .setNotification(AndroidNotification.builder()
                                .setChannelId(androidChannelId)
                                .build())
                        .build())
                .build();

        FirebaseMessaging.getInstance().send(message);
    }

    private synchronized void initialize() {
        if (!isConfigured()) {
            throw new IllegalStateException("Firebase credentials are not configured");
        }
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try (FileInputStream credentialsStream = new FileInputStream(credentialsPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();
            FirebaseApp.initializeApp(options);
        } catch (IOException exception) {
            log.error("Unable to initialize Firebase credentials", exception);
            throw new IllegalStateException("Unable to initialize Firebase credentials", exception);
        }
    }
}
