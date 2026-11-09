#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "secrets.h"
#include "core/Log.h"
#include "net/BleProvisioning.h"
#include "net/DeviceStorage.h"
#include "net/NetworkTask.h"
#include "sensors/Motion.h"
#include "sensors/Vitals.h"
#include "ui/Buttons.h"
#include "ui/Buzzer.h"
#include "ui/Display.h"

static_assert(sizeof(DEVICE_ID) - 1 >= DEVICE_ID_MIN_LENGTH, "DEVICE_ID must be at least 8 characters (backend rule)");
static_assert(sizeof(DEVICE_ID) - 1 <= DEVICE_ID_MAX_LENGTH, "DEVICE_ID must be at most 23 characters (BLE name limit)");

enum class Mode { Provisioning, Running };

static Mode mode = Mode::Provisioning;

// Provisioning (pairing) state, used only by loop()
static ProvState lastBleState = ProvState::Idle;
static ProvisionStage lastProvisionStage = ProvisionStage::Idle;
static uint32_t lastPairingPrompt = 0;
static bool finishingProvisioning = false;
static uint32_t provisioningDoneAt = 0;
static DeviceConfig provisionedConfig;

// Running state
static bool announcedConnected = false;
static bool lastWifiConnected = false;
static bool lastMqttConnected = false;

// ---------- helpers ----------

static bool deviceIdIsValid(const char *id) {
    for (size_t i = 0; id[i] != '\0'; i++) {
        char c = id[i];
        bool valid = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-';
        if (!valid) {
            return false;
        }
    }
    return true;
}

static const char *stageName(ProvisionStage stage) {
    switch (stage) {
        case ProvisionStage::Idle:           return "IDLE";
        case ProvisionStage::WifiConnecting: return "WIFI_CONNECTING";
        case ProvisionStage::Claiming:       return "CLAIMING";
        case ProvisionStage::Success:        return "SUCCESS";
        case ProvisionStage::Failed:         return "FAILED";
    }
    return "IDLE";
}

static bool waitingForConfirmation() {
    return mode == Mode::Provisioning && bleState() == ProvState::WaitingConfirmation;
}

// ---------- modes ----------

static void startProvisioningMode() {
    mode = Mode::Provisioning;
    logPrintf("MODE", "Provisioning: waiting for the CaTch app over BLE");
    bleStart(DEVICE_ID);
}

static void startRunningMode(const DeviceConfig &config) {
    mode = Mode::Running;
    logPrintf("MODE", "Running: Wi-Fi \"%s\" + MQTT", config.ssid.c_str());
    networkStartRunning(config);
}

static void checkFactoryReset() {
    if (digitalRead(SELECT_PIN) != LOW) {
        return;
    }
    logPrintf("BOOT", "SELECT held at power-on, keep holding %d s for factory reset", FACTORY_RESET_HOLD_MS / 1000);

    uint32_t start = millis();
    while (digitalRead(SELECT_PIN) == LOW) {
        if ((uint32_t)(millis() - start) >= FACTORY_RESET_HOLD_MS) {
            clearDeviceConfig();
            buzzerPlay(Sound::FactoryReset);
            logPrintf("BOOT", "Factory reset done");
            return;
        }
        delay(10);
    }
    logPrintf("BOOT", "SELECT released early, no factory reset");
}

// ---------- buttons ----------

static void handleDisplayAction(DisplayAction action) {
    if (action == DisplayAction::ToggleSound) {
        buzzerSetEnabled(!buzzerIsEnabled());
    }
}

static void onNextButton(bool pressed) {
    logPrintf("BUTTON", "NEXT %s", pressed ? "pressed" : "released");
    if (!pressed) {
        return;
    }
    if (waitingForConfirmation()) {
        bleRejectPressed();
        buzzerPlay(Sound::Rejected);
        return;
    }
    handleDisplayAction(displayNext());
}

static void onSelectButton(bool pressed) {
    logPrintf("BUTTON", "SELECT %s", pressed ? "pressed" : "released");
    if (!pressed) {
        return;
    }
    if (waitingForConfirmation()) {
        bleConfirmPressed();
        buzzerPlay(Sound::Confirmed);
        return;
    }
    handleDisplayAction(displaySelect());
}

// ---------- per-mode updates ----------

static void updateProvisioning(uint32_t now) {
    bleUpdate(now);

    ProvState ble = bleState();
    if (ble != lastBleState) {
        logPrintf("BLE", "State %s -> %s", bleStateName(lastBleState), bleStateName(ble));
        if (ble == ProvState::WaitingConfirmation) {
            buzzerPlay(Sound::PairingRequest);
            lastPairingPrompt = now;
        }
        lastBleState = ble;
    }
    if (ble == ProvState::WaitingConfirmation && (uint32_t)(now - lastPairingPrompt) >= PAIRING_PROMPT_INTERVAL_MS) {
        buzzerPlay(Sound::PairingRequest);
        lastPairingPrompt = now;
    }

    if (bleTakeCancel()) {
        logPrintf("BLE", "App cancelled the pairing");
        networkCancelProvisioning();
    }

    ProvisionRequest request;
    if (bleTakeConnectRequest(request)) {
        logPrintf("BLE", "CONNECT received, handing over to the network task");
        networkStartProvisioning(request);
    }

    // Mirror the network task's progress to the app over BLE
    ProvisionStage stage = networkGetProvisionStage();
    if (stage != lastProvisionStage) {
        logPrintf("NET", "Provisioning stage %s -> %s", stageName(lastProvisionStage), stageName(stage));
        if (stage == ProvisionStage::WifiConnecting) {
            bleSetState(ProvState::WifiConnecting);
        } else if (stage == ProvisionStage::Claiming) {
            bleSetState(ProvState::Claiming);
        }
        lastProvisionStage = stage;
    }

    ProvisionResult result;
    if (networkTakeProvisionResult(result)) {
        lastProvisionStage = ProvisionStage::Idle;
        if (result.stage == ProvisionStage::Success) {
            saveDeviceConfig(result.config);
            bleSetState(ProvState::Done);
            buzzerPlay(Sound::PairingSuccess);
            provisionedConfig = result.config;
            finishingProvisioning = true;
            provisioningDoneAt = now;
        } else {
            logPrintf("NET", "Provisioning failed: %s %s", result.errorCode.c_str(), result.errorMessage.c_str());
            bleReportError(result.errorCode.c_str(), result.errorMessage.c_str());
            buzzerPlay(Sound::Error);
        }
    }

    // Keep BLE on for a moment so the app reads DONE, then switch modes
    if (finishingProvisioning && (uint32_t)(now - provisioningDoneAt) >= PROVISION_DONE_DELAY_MS) {
        finishingProvisioning = false;
        bleStop();
        startRunningMode(provisionedConfig);
    }
}

static void updateRunning(bool newMotionSample) {
    if (newMotionSample) {
        Measurement measurement;
        motionGetLatest(measurement.motion);
        vitalsRead(measurement.vitals);
        networkSubmitMeasurement(measurement);
    }

    bool wifi = networkIsWifiConnected();
    bool mqtt = networkIsMqttConnected();
    if (wifi != lastWifiConnected || mqtt != lastMqttConnected) {
        logPrintf("STATUS", "Wi-Fi %s, MQTT %s", wifi ? "connected" : "offline", mqtt ? "connected" : "offline");
        lastWifiConnected = wifi;
        lastMqttConnected = mqtt;
    }
    if (mqtt && !announcedConnected) {
        buzzerPlay(Sound::Connected);
        announcedConnected = true;
    }
}

static void updateScreen(uint32_t now) {
    DisplayData data;
    data.running = mode == Mode::Running;
    data.bleState = bleState();
    data.provisionStage = networkGetProvisionStage();
    data.wifiConnected = networkIsWifiConnected();
    data.mqttConnected = networkIsMqttConnected();
    data.motionReady = motionIsReady();
    data.hasMotion = motionGetLatest(data.motion);
    vitalsRead(data.vitals);
    data.soundEnabled = buzzerIsEnabled();
    displayUpdate(now, data);
}

// ---------- Arduino entry points ----------

void setup() {
    logBegin(SERIAL_BAUD_RATE);
    delay(500);
    logPrintf("BOOT", "CaTch firmware %s, device %s", FW_VERSION, DEVICE_ID);

    if (!deviceIdIsValid(DEVICE_ID)) {
        logPrintf("BOOT", "ERROR: DEVICE_ID may contain only letters, digits, '_' and '-'");
    }

    buttonsBegin(NEXT_PIN, SELECT_PIN);
    buzzerBegin(BUZZER_PIN);

    // One I2C bus for the MPU6050 and the OLED; both are used only from loop()
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(I2C_CLOCK_HZ);
    logPrintf("BOOT", "I2C on SDA %d / SCL %d at %d Hz", SDA_PIN, SCL_PIN, I2C_CLOCK_HZ);
    displayBegin();

    checkFactoryReset();
    networkBegin();

    DeviceConfig config;
    if (loadDeviceConfig(config)) {
        startRunningMode(config);
    } else {
        startProvisioningMode();
    }
    logPrintf("BOOT", "Setup done, loop() runs on core %d", xPortGetCoreID());
}

void loop() {
    uint32_t now = millis();

    buttonsUpdate(now, onNextButton, onSelectButton);
    buzzerUpdate(now);
    bool newMotionSample = motionUpdate(now);

    if (mode == Mode::Provisioning) {
        updateProvisioning(now);
    } else {
        updateRunning(newMotionSample);
    }

    updateScreen(now);
    delay(1);
}
