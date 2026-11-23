package com.legends.server.realtime;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DeviceTopics {

    public static final String ENDPOINT = "/ws";
    public static final String BROKER_PREFIX = "/topic";

    private static final String DEVICE_PREFIX = BROKER_PREFIX + "/devices/";
    private static final String USER_PREFIX = BROKER_PREFIX + "/users/";
    private static final Pattern DEVICE_TOPIC = Pattern.compile("^/topic/devices/([A-Za-z0-9_-]{8,64})$");
    private static final Pattern USER_TOPIC = Pattern.compile("^/topic/users/([0-9]+)/notifications$");

    private DeviceTopics() {
    }

    public static String device(String deviceId) {
        return DEVICE_PREFIX + deviceId;
    }

    public static String userNotifications(Long userId) {
        return USER_PREFIX + userId + "/notifications";
    }

    public static Optional<String> deviceIdOf(String destination) {
        if (destination == null) {
            return Optional.empty();
        }
        Matcher matcher = DEVICE_TOPIC.matcher(destination);
        return matcher.matches() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    public static Optional<Long> notificationUserIdOf(String destination) {
        if (destination == null) {
            return Optional.empty();
        }
        Matcher matcher = USER_TOPIC.matcher(destination);
        return matcher.matches() ? Optional.of(Long.valueOf(matcher.group(1))) : Optional.empty();
    }
}
