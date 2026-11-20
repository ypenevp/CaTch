#ifndef NETWORK_TASK_H
#define NETWORK_TASK_H

#include <Arduino.h>
#include "net/BleProvisioning.h"
#include "net/DeviceStorage.h"
#include "sensors/Motion.h"
#include "sensors/Vitals.h"

// Everything slow (Wi-Fi connect, HTTP claim, MQTT connect/publish) runs in a
// FreeRTOS task on core 0, so loop() on core 1 never waits for the network.

enum class ProvisionStage {
    Idle,
    WifiConnecting,
    Claiming,
    Success,
    Failed
};

struct ProvisionResult {
    ProvisionStage stage;    // Success or Failed
    String errorCode;        // BLE error code, e.g. WIFI_NOT_FOUND
    String errorMessage;
    DeviceConfig config;     // filled on Success
};

struct Measurement {
    MotionSample motion;
    VitalsSample vitals;
};

void networkBegin();

// Provisioning: Wi-Fi + claim with the data received over BLE
void networkStartProvisioning(const ProvisionRequest &request);
void networkCancelProvisioning();
ProvisionStage networkGetProvisionStage();
bool networkTakeProvisionResult(ProvisionResult &result);   // true once per finished attempt

// Running: keep Wi-Fi + MQTT up and publish the latest measurement
void networkStartRunning(const DeviceConfig &config);
void networkSubmitMeasurement(const Measurement &measurement);

bool networkIsWifiConnected();
bool networkIsMqttConnected();

#endif
