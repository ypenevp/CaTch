#include "net/NetworkTask.h"

#include <WiFi.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/queue.h>
#include "config.h"
#include "core/Log.h"
#include "net/Claim.h"
#include "net/MqttClient.h"

// ---------- shared state (guarded by stateMutex) ----------
static SemaphoreHandle_t stateMutex = NULL;

static bool provisionRequested = false;
static bool provisionCancelled = false;
static ProvisionRequest pendingRequest;
static ProvisionStage provisionStage = ProvisionStage::Idle;
static bool resultReady = false;
static ProvisionResult finishedResult;

static bool runRequested = false;
static DeviceConfig runConfig;

// Latest measurement from loop(); a queue of length 1 used as a mailbox
static QueueHandle_t measurementQueue = NULL;

// Written only by the network task, read by loop()
static volatile bool wifiConnected = false;
static volatile bool mqttConnected = false;

// ---------- network task only ----------
static bool running = false;
static uint32_t lastPublish = 0;
static uint32_t lastWifiAttempt = 0;
static DeviceConfig activeConfig;

static void lockState() {
    xSemaphoreTake(stateMutex, portMAX_DELAY);
}

static void unlockState() {
    xSemaphoreGive(stateMutex);
}

static void setStage(ProvisionStage stage) {
    lockState();
    provisionStage = stage;
    unlockState();
}

static bool isCancelled() {
    lockState();
    bool cancelled = provisionCancelled;
    unlockState();
    return cancelled;
}

static void finishProvisioning(ProvisionStage stage, const char *errorCode, const String &errorMessage,
                               const DeviceConfig &config) {
    lockState();
    finishedResult.stage = stage;
    finishedResult.errorCode = errorCode;
    finishedResult.errorMessage = errorMessage;
    finishedResult.config = config;
    resultReady = true;
    provisionStage = stage;
    unlockState();
}

static void runProvisioning(const ProvisionRequest &request) {
    DeviceConfig config;
    config.ssid = request.ssid;
    config.wifiPassword = request.password;

    logPrintf("NET", "Provisioning started for Wi-Fi \"%s\"", request.ssid.c_str());
    setStage(ProvisionStage::WifiConnecting);

    WifiResult wifi = connectWifi(request.ssid, request.password, WIFI_CONNECT_TIMEOUT_MS);
    if (wifi != WifiResult::Ok) {
        const char *code = wifi == WifiResult::NotFound ? "WIFI_NOT_FOUND"
                         : wifi == WifiResult::AuthFailed ? "WIFI_AUTH_FAILED"
                         : "WIFI_TIMEOUT";
        finishProvisioning(ProvisionStage::Failed, code, "", config);
        return;
    }
    wifiConnected = true;

    if (isCancelled()) {
        logPrintf("NET", "Provisioning cancelled by the app after Wi-Fi connect");
        WiFi.disconnect(true);
        wifiConnected = false;
        setStage(ProvisionStage::Idle);
        return;
    }

    setStage(ProvisionStage::Claiming);
    String error;
    ClaimResult claim = claimDevice(request.pairingToken, config, error);
    if (claim != ClaimResult::Ok) {
        WiFi.disconnect(true);
        wifiConnected = false;
        const char *code = claim == ClaimResult::Rejected ? "CLAIM_REJECTED" : "CLAIM_NETWORK";
        finishProvisioning(ProvisionStage::Failed, code, error, config);
        return;
    }

    logPrintf("NET", "Provisioning finished successfully");
    finishProvisioning(ProvisionStage::Success, "", "", config);
}

static void startRunning(const DeviceConfig &config) {
    activeConfig = config;
    running = true;

    if (WiFi.status() == WL_CONNECTED && WiFi.SSID() == config.ssid) {
        logPrintf("WIFI", "Already connected to \"%s\"", config.ssid.c_str());
    } else {
        logPrintf("WIFI", "Connecting to \"%s\" in the background", config.ssid.c_str());
        WiFi.mode(WIFI_STA);
        WiFi.setAutoReconnect(true);
        WiFi.begin(config.ssid.c_str(), config.wifiPassword.c_str());
        lastWifiAttempt = millis();
    }
    mqttBegin();
}

static void updateWifi(uint32_t now) {
    bool connected = WiFi.status() == WL_CONNECTED;

    if (connected && !wifiConnected) {
        logPrintf("WIFI", "Connected to \"%s\", IP %s, RSSI %d dBm",
                  activeConfig.ssid.c_str(), WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else if (!connected && wifiConnected) {
        logPrintf("WIFI", "Disconnected (status %d)", (int)WiFi.status());
        lastWifiAttempt = now;
    }
    wifiConnected = connected;

    // Auto-reconnect usually handles it; this is the fallback
    if (!connected && (uint32_t)(now - lastWifiAttempt) >= WIFI_RECONNECT_INTERVAL_MS) {
        logPrintf("WIFI", "Still offline, reconnecting to \"%s\"", activeConfig.ssid.c_str());
        WiFi.disconnect();
        WiFi.begin(activeConfig.ssid.c_str(), activeConfig.wifiPassword.c_str());
        lastWifiAttempt = now;
    }
}

static void publishIfDue(uint32_t now) {
    if (!mqttConnected || (uint32_t)(now - lastPublish) < MQTT_PUBLISH_INTERVAL_MS) {
        return;
    }

    Measurement measurement;
    if (xQueuePeek(measurementQueue, &measurement, 0) != pdTRUE) {
        return;   // no sensor data yet
    }
    if (mqttPublishMeasurement(measurement.motion, measurement.vitals)) {
        lastPublish = now;
    }
}

static void networkTaskMain(void *parameter) {
    logPrintf("NET", "Network task started on core %d", xPortGetCoreID());

    while (true) {
        ProvisionRequest request;
        bool hasRequest = false;
        lockState();
        if (provisionRequested) {
            request = pendingRequest;
            provisionRequested = false;
            provisionCancelled = false;
            hasRequest = true;
        }
        unlockState();
        if (hasRequest) {
            runProvisioning(request);
        }

        DeviceConfig config;
        bool startRun = false;
        lockState();
        if (runRequested) {
            config = runConfig;
            runRequested = false;
            startRun = true;
        }
        unlockState();
        if (startRun) {
            startRunning(config);
        }

        if (running) {
            uint32_t now = millis();
            updateWifi(now);
            mqttUpdate(now);
            mqttConnected = wifiConnected && mqttIsConnected();
            publishIfDue(now);
        }

        vTaskDelay(pdMS_TO_TICKS(NETWORK_TASK_PERIOD_MS));
    }
}

// ---------- API used by loop() ----------

void networkBegin() {
    stateMutex = xSemaphoreCreateMutex();
    measurementQueue = xQueueCreate(1, sizeof(Measurement));
    xTaskCreatePinnedToCore(networkTaskMain, "network", NETWORK_TASK_STACK_SIZE, NULL,
                            NETWORK_TASK_PRIORITY, NULL, NETWORK_TASK_CORE);
}

void networkStartProvisioning(const ProvisionRequest &request) {
    lockState();
    pendingRequest = request;
    provisionRequested = true;
    provisionCancelled = false;
    resultReady = false;
    unlockState();
}

void networkCancelProvisioning() {
    lockState();
    provisionCancelled = true;
    provisionRequested = false;
    unlockState();
}

ProvisionStage networkGetProvisionStage() {
    lockState();
    ProvisionStage stage = provisionStage;
    unlockState();
    return stage;
}

bool networkTakeProvisionResult(ProvisionResult &result) {
    lockState();
    bool ready = resultReady;
    if (ready) {
        result = finishedResult;
        resultReady = false;
        provisionStage = ProvisionStage::Idle;
    }
    unlockState();
    return ready;
}

void networkStartRunning(const DeviceConfig &config) {
    lockState();
    runConfig = config;
    runRequested = true;
    unlockState();
}

void networkSubmitMeasurement(const Measurement &measurement) {
    // Overwrite keeps only the newest sample; it never blocks loop()
    xQueueOverwrite(measurementQueue, &measurement);
}

bool networkIsWifiConnected() {
    return wifiConnected;
}

bool networkIsMqttConnected() {
    return mqttConnected;
}
