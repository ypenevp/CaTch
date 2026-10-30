package com.legends.server.device.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

public final class DeviceSecretGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private DeviceSecretGenerator() {
    }

    public static String generateToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public static String sha256(String value) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] valueBytes = value.getBytes(StandardCharsets.UTF_8);
            byte[] digest = messageDigest.digest(valueBytes);

            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    public static boolean matches(String rawValue, String expectedHash) {
        return MessageDigest.isEqual(sha256(rawValue).getBytes(StandardCharsets.UTF_8), expectedHash.getBytes(StandardCharsets.UTF_8)
        );
    }
}
