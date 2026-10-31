#ifndef DEVICE_STORAGE_H
#define DEVICE_STORAGE_H

#include <Arduino.h>

struct DeviceConfig {
    String ssid;
    String wifiPassword;
    String mqttUsername;
    String mqttPassword;
};

bool loadDeviceConfig(DeviceConfig &config);
bool saveDeviceConfig(const DeviceConfig &config);
void clearDeviceConfig();

#endif
