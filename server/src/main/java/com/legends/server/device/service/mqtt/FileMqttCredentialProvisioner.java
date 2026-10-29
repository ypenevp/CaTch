package com.legends.server.device.service.mqtt;

import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMqttCredential;
import com.legends.server.device.entity.DeviceMqttCredentialStatus;
import com.legends.server.device.repository.DeviceMqttCredentialRepository;
import com.legends.server.device.util.DeviceSecretGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FileMqttCredentialProvisioner implements MqttCredentialProvisioner {

    private final DeviceMqttCredentialRepository credentialRepository;
    private final MqttBrokerAccessManager brokerAccessManager;

    public FileMqttCredentialProvisioner(
            DeviceMqttCredentialRepository credentialRepository,
            MqttBrokerAccessManager brokerAccessManager
    ) {
        this.credentialRepository = credentialRepository;
        this.brokerAccessManager = brokerAccessManager;
    }

    @Override
    @Transactional
    public MqttCredentials provision(Device device) {
        DeviceMqttCredential credential = credentialRepository.findByDeviceId(device.getId())
                .orElseGet(DeviceMqttCredential::new);
        String username = "device-" + device.getDeviceId();
        String password = DeviceSecretGenerator.generateToken(32);

        credential.setDevice(device);
        credential.setUsername(username);
        credential.setPasswordHash(DeviceSecretGenerator.sha256(password));
        credential.setStatus(DeviceMqttCredentialStatus.ACTIVE);
        credential.setRevokedAt(null);
        credentialRepository.save(credential);

        brokerAccessManager.provision(username, password, device.getDeviceId());
        return new MqttCredentials(username, password);
    }
}
