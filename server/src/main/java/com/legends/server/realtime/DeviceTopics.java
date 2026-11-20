package com.legends.server.realtime;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DeviceTopics {

    public static final String ENDPOINT = "/ws";
    public static final String BROKER_PREFIX = "/topic";

    private static final String DEVICE_PREFIX = BROKER_PREFIX + "/devices/";
    private static final Pattern DEVICE_TOPIC = Pattern.compile("^/topic/devices/([A-Za-z0-9_-]{8,64})$");

    private DeviceTopics() {
    }

    public static String device(String deviceId) {
        return DEVICE_PREFIX + deviceId;
    }

    public static Optional<String> deviceIdOf(String destination) {
        if (destination == null) {
            return Optional.empty();
        }
        Matcher matcher = DEVICE_TOPIC.matcher(destination);
        return matcher.matches() ? Optional.of(matcher.group(1)) : Optional.empty();
    }
}
