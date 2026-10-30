
#include <Arduino.h>
#include <secrets.h>
#include <math.h>
#include <config.h>

#include <MPU6050.h>
#include <Buttons.h>
#include <Buzzer.h>

#include <WiFi.h>
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

// Handles CONNECT: Wi-Fi -> claim against the backend -> save to NVS.
static void handleProvisionRequest(const ProvisionRequest &req) {
    bleSetState(ProvState::WifiConnecting);

    const WifiResult wifi = connectWifi(req.ssid, req.password, WIFI_CONNECT_TIMEOUT_MS);
    if (wifi != WifiResult::Ok) {
        const char *code = wifi == WifiResult::NotFound   ? "WIFI_NOT_FOUND"
                         : wifi == WifiResult::AuthFailed ? "WIFI_AUTH_FAILED"
                                                          : "WIFI_TIMEOUT";
        bleReportError(code);
        return;  // back in CONFIRMED, the app can retry
    }

    bleSetState(ProvState::Claiming);
    DeviceConfig config;
    config.ssid = req.ssid;
    config.wifiPassword = req.password;

    String error;
    const ClaimResult result = claimDevice(req.pairingToken, config, error);
    if (result != ClaimResult::Ok) {
        WiFi.disconnect(true);
        bleReportError(result == ClaimResult::Rejected ? "CLAIM_REJECTED" : "CLAIM_NETWORK",
                       error.c_str());
        return;
    }

    // Credentials are saved to NVS only after a successful claim
    saveDeviceConfig(config);
    bleSetState(ProvState::Done);
    delay(1500);  // BLE turns off within ~2 s after DONE
    bleStop();

    enterRunningMode(config);
    beep(2800, 120);
}

void onNext(bool pressed) {
    Serial.print("Next ");
    Serial.println(pressed ? "pressed" : "released");

    if (pressed) {
        beep(2000, 60);
    }
}

void onSelect(bool pressed) {
    Serial.print("Select ");
    Serial.println(pressed ? "pressed" : "released");

    if (pressed) {
        beep(2800, 120);
        bleConfirmPressed();  // confirms the BLE pairing if it is waiting
    }
}

void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    delay(1000);

    beginButtons(NEXT_PIN, SELECT_PIN);
    beginBuzzer(BUZZER_PIN);
    beginMPU6050(SDA_PIN, SCL_PIN);

    Serial.println("MPU6050, buttons and buzzer starting...");

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

        // No display: beep while waiting for SELECT
        static uint32_t lastPrompt = 0;
        if (bleState() == ProvState::WaitingConfirmation &&
            static_cast<uint32_t>(now - lastPrompt) >= 3000) {
            beep(2400, 150);
            lastPrompt = now;
        }

        if (bleTakeCancel()) {
            WiFi.disconnect(true);
        }

        ProvisionRequest request;
        if (bleTakeConnectRequest(request)) {
            handleProvisionRequest(request);
        }
    } else {
        mqttUpdate(now);
    }

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

    // Interval between measurements
    if (static_cast<uint32_t>(
            now - lastMotionPrint
        ) < MOTION_INTERVAL_MS) {
        return;
    }

    lastMotionPrint = now;

    MotionData motion{};

    // Read the sensor data
    if (!readMotion(motion)) {
        Serial.println("MPU6050 read error; reinitializing");

        mpuInitialized = false;
        havePrevious = false;

        return;
    }

    // Convert to physical units
    const float ax = motion.ax / ACCEL_SCALE;
    const float ay = motion.ay / ACCEL_SCALE;
    const float az = motion.az / ACCEL_SCALE;

    const float gx = motion.gx / GYRO_SCALE;
    const float gy = motion.gy / GYRO_SCALE;
    const float gz = motion.gz / GYRO_SCALE;

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
        if (mqttPublishMeasurement(ax, ay, az, gx, gy, gz)) {
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

    Serial.print(" | Gyro [deg/s]: ");
    Serial.print(gx, 2);
    Serial.print(", ");
    Serial.print(gy, 2);
    Serial.print(", ");
    Serial.println(gz, 2);
}
