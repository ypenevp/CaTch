
#include <Arduino.h>
#include <secrets.h>
#include <math.h>
#include <config.h>

#include <MPU6050.h>
#include <StepCounter.h>
#include <Buttons.h>
#include <Buzzer.h>
#include <Display.h>

#include <WiFi.h>
#include <esp_system.h>
#include "net/DeviceStorage.h"
#include "net/BleProvisioning.h"
#include "net/Claim.h"
#include "net/MqttClient.h"

constexpr bool isValidDeviceIdChar(char c) {
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
           (c >= '0' && c <= '9') || c == '_' || c == '-';
}

constexpr bool isValidDeviceId(const char *id) {
    return *id == '\0' || (isValidDeviceIdChar(*id) && isValidDeviceId(id + 1));
}

static_assert(sizeof(DEVICE_ID) - 1 >= DEVICE_ID_MIN_LENGTH,
              "DEVICE_ID must be at least 8 characters (backend validation)");
static_assert(sizeof(DEVICE_ID) - 1 <= DEVICE_ID_MAX_LENGTH,
              "DEVICE_ID must be at most 23 characters to fit in the BLE name");
static_assert(isValidDeviceId(DEVICE_ID),
              "DEVICE_ID may contain only letters, digits, '_' and '-' (backend validation)");

enum class Mode { Provisioning, Running };
static Mode mode = Mode::Provisioning;

// Applies the stored configuration and switches to running mode (Wi-Fi + MQTT).
static void enterRunningMode(const DeviceConfig &config) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(config.ssid.c_str(), config.wifiPassword.c_str());
    mqttBegin(config.mqttUsername, config.mqttPassword);
    mode = Mode::Running;
    Serial.println("Running mode: WiFi + MQTT");
}

// A pairing request confirmed by the backend, waiting for the answer on the screen.
struct PendingPairing {
    bool active = false;
    DeviceConfig config;
    String pairingToken;
    uint32_t startedAt = 0;
};
static PendingPairing pendingPairing;

enum class PairingAnswer { None, Accept, Reject };
static PairingAnswer pairingAnswer = PairingAnswer::None;

// Random id of this power-on, sent with the step counter (see MqttClient.h).
static uint32_t bootId = 0;

// Last sensor sample, kept for the SENSOR screen.
static MotionData lastMotion{};
static bool haveLastMotion = false;

// Removes the question from the screen and forgets the request.
static void closePairingPrompt() {
    pendingPairing = PendingPairing();
    pairingAnswer = PairingAnswer::None;
    displayHidePairingPrompt();
}

// Handles CONNECT: Wi-Fi -> ask the backend about the pairing request ->
// show the question on the screen. The claim itself happens in
// completePairing() once the user answers with SELECT.
static void handleProvisionRequest(const ProvisionRequest &req) {
    bleSetState(ProvState::WifiConnecting);
    displayShowStatus("Connecting to WiFi", "Please wait...");

    const WifiResult wifi = connectWifi(req.ssid, req.password, WIFI_CONNECT_TIMEOUT_MS);
    if (wifi != WifiResult::Ok) {
        const char *code = wifi == WifiResult::NotFound   ? "WIFI_NOT_FOUND"
                         : wifi == WifiResult::AuthFailed ? "WIFI_AUTH_FAILED"
                                                          : "WIFI_TIMEOUT";
        bleReportError(code);
        return;  // back in CONFIRMED, the app can retry
    }

    bleSetState(ProvState::Claiming);
    displayShowStatus("Checking request", "Please wait...");

    PairingRequestInfo info;
    String error;
    const ClaimResult result = fetchPairingRequest(req.pairingToken, info, error);
    if (result != ClaimResult::Ok) {
        WiFi.disconnect(true);
        bleReportError(result == ClaimResult::Rejected ? "CLAIM_REJECTED" : "CLAIM_NETWORK",
                       error.c_str());
        return;
    }

    // The phone left (disconnect / CANCEL) while the request was being checked
    if (bleState() != ProvState::Claiming) {
        WiFi.disconnect(true);
        return;
    }

    pendingPairing.active = true;
    pendingPairing.config.ssid = req.ssid;
    pendingPairing.config.wifiPassword = req.password;
    pendingPairing.pairingToken = req.pairingToken;
    pendingPairing.startedAt = millis();
    pairingAnswer = PairingAnswer::None;

    displayShowPairingPrompt(info.requestedBy, info.requestedByEmail);
    bleSetState(ProvState::Claiming, "DEVICE_CONFIRMATION");
    beep(2400, 150);
    Serial.println("Pairing: request received from the backend, waiting for SELECT / NEXT");
}

// SELECT on the pairing question: claim against the backend -> save to NVS.
static void completePairing() {
    DeviceConfig config = pendingPairing.config;
    const String pairingToken = pendingPairing.pairingToken;
    closePairingPrompt();

    bleSetState(ProvState::Claiming);
    displayShowStatus("Registering device", "Please wait...");

    String error;
    const ClaimResult result = claimDevice(pairingToken, config, error);
    if (result != ClaimResult::Ok) {
        WiFi.disconnect(true);
        bleReportError(result == ClaimResult::Rejected ? "CLAIM_REJECTED" : "CLAIM_NETWORK",
                       error.c_str());
        return;
    }

    // Credentials are saved to NVS only after a successful claim
    saveDeviceConfig(config);
    Serial.println("Provisioning: device config saved");
    bleSetState(ProvState::Done);
    delay(1500);  // BLE turns off within ~2 s after DONE
    bleStop();

    enterRunningMode(config);
    beep(2800, 120);
}

// NEXT on the pairing question: tell the backend and go back to CONFIRMED.
static void rejectPairing() {
    const String pairingToken = pendingPairing.pairingToken;
    closePairingPrompt();

    displayShowStatus("Pairing rejected", "Please wait...");
    if (!rejectPairingRequest(pairingToken)) {
        Serial.println("Pairing: could not report the rejection to the backend");
    }
    WiFi.disconnect(true);
    bleReportError("PAIRING_REJECTED", "Pairing was rejected on the device");
    Serial.println("Pairing: rejected by NEXT");
}

// Answer, timeout or a vanished phone while the question is on the screen.
static void updatePairingPrompt() {
    if (!pendingPairing.active) return;

    // Not loop()'s `now`: it is older than startedAt right after the blocking
    // Wi-Fi / HTTP steps in handleProvisionRequest().
    const uint32_t now = millis();

    // The phone disconnected or sent CANCEL
    if (bleState() != ProvState::Claiming) {
        closePairingPrompt();
        WiFi.disconnect(true);
        Serial.println("Pairing: cancelled, phone is gone");
        return;
    }

    if (pairingAnswer == PairingAnswer::Accept) {
        completePairing();
    } else if (pairingAnswer == PairingAnswer::Reject) {
        rejectPairing();
    } else if (static_cast<uint32_t>(now - pendingPairing.startedAt) >= PAIR_CONFIRM_TIMEOUT_MS) {
        closePairingPrompt();
        WiFi.disconnect(true);
        bleReportError("PAIRING_TIMEOUT", "No answer on the device");
        Serial.println("Pairing: no answer, timed out");
    }
}

void onNext(bool pressed) {
    Serial.print("Next ");
    Serial.println(pressed ? "pressed" : "released");

    if (!pressed) return;
    beep(2000, 60);

    if (pendingPairing.active) {
        pairingAnswer = PairingAnswer::Reject;  // "Pair this device?" -> no
    } else if (mode == Mode::Provisioning && bleState() == ProvState::WaitingConfirmation) {
        bleRejectPressed();
    } else {
        displayNext();
    }
}

void onSelect(bool pressed) {
    Serial.print("Select ");
    Serial.println(pressed ? "pressed" : "released");

    if (!pressed) return;
    beep(2800, 120);

    if (pendingPairing.active) {
        pairingAnswer = PairingAnswer::Accept;  // "Pair this device?" -> yes
    } else if (mode == Mode::Provisioning && bleState() == ProvState::WaitingConfirmation) {
        bleConfirmPressed();  // confirms the BLE connection
    } else {
        displaySelect();
    }
}

void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    delay(1000);

    bootId = esp_random();

    beginButtons(NEXT_PIN, SELECT_PIN);
    beginBuzzer(BUZZER_PIN);
    beginMPU6050(SDA_PIN, SCL_PIN);
    beginDisplay(SDA_PIN, SCL_PIN);  // shares the I2C bus started by beginMPU6050()

    Serial.println("MPU6050, display, buttons and buzzer starting...");

    // Factory reset: hold SELECT while powering on
    if (digitalRead(SELECT_PIN) == LOW) {
        const uint32_t start = millis();
        while (digitalRead(SELECT_PIN) == LOW) {
            if (millis() - start >= FACTORY_RESET_HOLD_MS) {
                clearDeviceConfig();
                beep(1000, 400);
                Serial.println("Factory reset: stored config cleared");
                break;
            }
            delay(10);
        }
    }

    DeviceConfig config;
    if (loadDeviceConfig(config)) {
        enterRunningMode(config);
    } else {
        mode = Mode::Provisioning;
        bleStart(DEVICE_ID);
    }
}

void loop() {
    const uint32_t now = millis();

    updateButtons(now, onNext, onSelect);
    updateBuzzer(now);

    if (mode == Mode::Provisioning) {
        bleUpdate(now);

        // Beep while a question is waiting for SELECT / NEXT
        static uint32_t lastPrompt = 0;
        if ((bleState() == ProvState::WaitingConfirmation || pendingPairing.active) &&
            static_cast<uint32_t>(now - lastPrompt) >= 3000) {
            beep(2400, 150);
            lastPrompt = now;
        }

        if (bleTakeCancel()) {
            closePairingPrompt();
            WiFi.disconnect(true);
        }

        ProvisionRequest request;
        if (bleTakeConnectRequest(request) && !pendingPairing.active) {
            handleProvisionRequest(request);
        }

        updatePairingPrompt();
    } else {
        mqttUpdate(now);
    }

    updateDisplay(now, mode == Mode::Running, bleState(),
                WiFi.status() == WL_CONNECTED, mqttIsConnected(),
                mpuInitialized, haveLastMotion ? &lastMotion : nullptr, stepCount());

    // MPU6050 initialization. Retried without delay() so buttons and BLE keep
    // running even when the sensor is missing.
    if (!mpuInitialized) {
        static uint32_t lastMpuInitAttempt = 0;
        static bool mpuInitAttempted = false;

        if (mpuInitAttempted &&
            static_cast<uint32_t>(now - lastMpuInitAttempt) < MPU_RETRY_INTERVAL_MS) {
            return;
        }

        mpuInitAttempted = true;
        lastMpuInitAttempt = now;
        mpuInitialized = initializeMPU6050();

        if (!mpuInitialized) {
            Serial.println("MPU6050 init/I2C error; retrying");
            return;
        }

        Serial.println("MPU6050 ready (I2C 0x68)");
    }

    // The sensor is read at 50 Hz for the step counter; the rest below
    // (sudden motion, MQTT, serial) still runs every MOTION_INTERVAL_MS.
    static uint32_t lastSensorRead = 0;
    if (static_cast<uint32_t>(now - lastSensorRead) < STEP_SAMPLE_INTERVAL_MS) {
        return;
    }
    lastSensorRead = now;

    MotionData motion{};

    // Read the sensor data
    if (!readMotion(motion)) {
        Serial.println("MPU6050 read error; reinitializing");

        mpuInitialized = false;
        havePrevious = false;
        haveLastMotion = false;
        stepCounterResetSignal();

        return;
    }

    lastMotion = motion;
    haveLastMotion = true;

    // Convert to physical units
    const float ax = motion.ax / ACCEL_SCALE;
    const float ay = motion.ay / ACCEL_SCALE;
    const float az = motion.az / ACCEL_SCALE;

    const float gx = motion.gx / GYRO_SCALE;
    const float gy = motion.gy / GYRO_SCALE;
    const float gz = motion.gz / GYRO_SCALE;

    stepCounterUpdate(ax, ay, az, now);

    // Interval between measurements
    if (static_cast<uint32_t>(
            now - lastMotionPrint
        ) < MOTION_INTERVAL_MS) {
        return;
    }

    lastMotionPrint = now;

    if (havePrevious) {
        // Change of the acceleration vector (g)
        const float dax = ax - prevAx;
        const float day = ay - prevAy;
        const float daz = az - prevAz;

        const float accelChange = sqrtf(
            dax * dax + day * day + daz * daz
        );

        // Change of the angular velocity vector (deg/s)
        const float dgx = gx - prevGx;
        const float dgy = gy - prevGy;
        const float dgz = gz - prevGz;

        const float gyroChange = sqrtf(
            dgx * dgx + dgy * dgy + dgz * dgz
        );

        const bool suddenAcceleration =
            accelChange >= ACCEL_CHANGE_THRESHOLD;

        const bool suddenRotation =
            gyroChange >= GYRO_CHANGE_THRESHOLD;

        const bool cooldownPassed =
            static_cast<uint32_t>(
                now - lastMotionBeep
            ) >= BUZZER_COOLDOWN_MS;

        if ((suddenAcceleration || suddenRotation)
            && cooldownPassed) {

            beep(
                MOTION_BEEP_FREQ,
                MOTION_BEEP_DURATION_MS
            );

            lastMotionBeep = now;

            Serial.print("SUDDEN MOTION! Accel change: ");
            Serial.print(accelChange, 3);
            Serial.print(" g | Gyro change: ");
            Serial.print(gyroChange, 2);
            Serial.println(" deg/s");
        }
    }

    // Store the current values
    prevAx = ax;
    prevAy = ay;
    prevAz = az;

    prevGx = gx;
    prevGy = gy;
    prevGz = gz;

    havePrevious = true;

    // Publish over MQTT (running mode only)
    if (mode == Mode::Running &&
        static_cast<uint32_t>(now - lastMqttPublish) >= MQTT_PUBLISH_INTERVAL_MS) {
        if (mqttPublishMeasurement(ax, ay, az, gx, gy, gz, stepCount(), bootId)) {
            lastMqttPublish = now;
        }
    }

    // Print the measurements
    Serial.print("Accel [g]: ");
    Serial.print(ax, 3);
    Serial.print(", ");
    Serial.print(ay, 3);
    Serial.print(", ");
    Serial.print(az, 3);

    Serial.print(" | Steps: ");
    Serial.print(stepCount());

    Serial.print(" | Gyro [deg/s]: ");
    Serial.print(gx, 2);
    Serial.print(", ");
    Serial.print(gy, 2);
    Serial.print(", ");
    Serial.println(gz, 2);
}
