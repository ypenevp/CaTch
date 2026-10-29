package com.legends.server.device.service.mqtt;

import com.legends.server.config.mqtt.MqttBrokerProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

@Component
public class MqttBrokerAccessManager {

    private static final Logger log = LoggerFactory.getLogger(MqttBrokerAccessManager.class);

    private final MqttBrokerProperties properties;

    public MqttBrokerAccessManager(MqttBrokerProperties properties) {
        this.properties = properties;
    }

    public void provision(String username, String password, String deviceId) {
        Path passwordFile = Path.of(properties.passwordFile());
        Path aclFile = Path.of(properties.aclFile());

        try {
            createParentDirectory(passwordFile);
            createParentDirectory(aclFile);
            runPasswordCommand(passwordFile, username, password);
            appendAclRule(aclFile, username, deviceId);
            reloadBroker();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not provision MQTT broker access", exception);
        }
    }

    private void runPasswordCommand(Path passwordFile, String username, String password)
            throws IOException {
        Process process = new ProcessBuilder(
                properties.passwordCommand(),
                "-b",
                passwordFile.toString(),
                username,
                password
        ).redirectErrorStream(true).start();

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                throw new IllegalStateException("mosquitto_passwd failed: " + output);
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while provisioning MQTT access", exception);
        }
    }

    private void appendAclRule(Path aclFile, String username, String deviceId) throws IOException {
        String rule = "user " + username + System.lineSeparator()
                + "topic write devices/" + deviceId + "/measurements" + System.lineSeparator();
        String existing = Files.exists(aclFile)
                ? Files.readString(aclFile, StandardCharsets.UTF_8)
                : "";
        if (!existing.contains("user " + username + System.lineSeparator())) {
            Files.writeString(
                    aclFile,
                    rule,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND
            );
        }
    }

    private void reloadBroker() {
        String reloadCommand = properties.reloadCommand();
        if (reloadCommand == null || reloadCommand.isBlank()) {
            log.warn("MQTT broker files changed but no reload command is configured");
            return;
        }

        try {
            Process process = new ProcessBuilder("cmd", "/c", reloadCommand)
                    .redirectErrorStream(true)
                    .start();
            if (process.waitFor() != 0) {
                throw new IllegalStateException("MQTT broker reload command failed");
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not reload MQTT broker", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while reloading MQTT broker", exception);
        }
    }

    private void createParentDirectory(Path file) throws IOException {
        Path parent = file.toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
    }
}
