package com.legends.server.device.service.mqtt;

import com.legends.server.device.entity.Device;

public interface MqttCredentialProvisioner {
    MqttCredentials provision(Device device);

    record MqttCredentials(String username, String password) {
    }
}
