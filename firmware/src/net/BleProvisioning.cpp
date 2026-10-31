#include "BleProvisioning.h"
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

#define FW_VERSION "0.1.0"
#define PROTO_VERSION 1
#define CONFIRM_TIMEOUT_MS 60000

#define SVC_UUID    "8117f76e-7648-4b23-93ad-8dc887232b00"
#define INFO_UUID   "8117f76e-7648-4b23-93ad-8dc887232b01"
#define STATUS_UUID "8117f76e-7648-4b23-93ad-8dc887232b02"
#define WIFI_UUID   "8117f76e-7648-4b23-93ad-8dc887232b03"
#define TOKEN_UUID  "8117f76e-7648-4b23-93ad-8dc887232b04"
#define CMD_UUID    "8117f76e-7648-4b23-93ad-8dc887232b05"

static NimBLEServer *server = nullptr;
static NimBLECharacteristic *statusChar = nullptr;
static bool active = false;

static volatile ProvState state = ProvState::Idle;
static volatile uint16_t connHandle = BLE_HS_CONN_HANDLE_NONE;
static volatile uint32_t confirmDeadline = 0;
static volatile bool disconnectRequested = false;

// Secrets live only in RAM and are cleared on done/error/CANCEL/disconnect.
// They are written by the BLE callbacks (NimBLE host task) and read by loop(),
// so every access goes through secretsMutex.
static String token, ssid, password;
static bool hasToken = false, hasCreds = false;
static bool connectPending = false;
static volatile bool cancelPending = false;

static SemaphoreHandle_t secretsMutex = nullptr;

class SecretsLock {
public:
    SecretsLock() { xSemaphoreTake(secretsMutex, portMAX_DELAY); }
    ~SecretsLock() { xSemaphoreGive(secretsMutex); }
    SecretsLock(const SecretsLock &) = delete;
    SecretsLock &operator=(const SecretsLock &) = delete;
};

static void clearSecrets() {
    SecretsLock lock;
    token = ""; ssid = ""; password = "";
    hasToken = false; hasCreds = false;
    connectPending = false;
}

static const char *stateName(ProvState s) {
    switch (s) {
        case ProvState::WaitingConfirmation: return "WAITING_CONFIRMATION";
        case ProvState::Confirmed:           return "CONFIRMED";
        case ProvState::WifiConnecting:      return "WIFI_CONNECTING";
        case ProvState::Claiming:            return "CLAIMING";
        case ProvState::Done:                return "DONE";
        default:                             return "IDLE";
    }
}

static void publishStatus(const char *name, const char *error, const char *message) {
    if (!statusChar) return;
    JsonDocument doc;
    doc["state"] = name;
    if (error) doc["error"] = error;
    if (message) {
        String m = message;
        if (m.length() > 80) m = m.substring(0, 80);  // STATUS must stay ≤ 180 bytes
        doc["message"] = m;
    }
    String json;
    serializeJson(doc, json);
    statusChar->setValue(std::string(json.c_str()));
    statusChar->notify();
}

void bleSetState(ProvState s) {
    state = s;
    publishStatus(stateName(s), nullptr, nullptr);
}

void bleReportError(const char *errorCode, const char *message) {
    publishStatus("ERROR", errorCode, message);
    // Protocol: after ERROR go back to CONFIRMED so the app can retry
    state = ProvState::Confirmed;
}

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer *s, ble_gap_conn_desc *desc) override {
        connHandle = desc->conn_handle;
        clearSecrets();
        confirmDeadline = millis() + CONFIRM_TIMEOUT_MS;
        bleSetState(ProvState::WaitingConfirmation);
        Serial.println("BLE: phone connected, waiting for SELECT");
    }
    void onDisconnect(NimBLEServer *s) override {
        connHandle = BLE_HS_CONN_HANDLE_NONE;
        clearSecrets();
        if (state != ProvState::Done) {
            state = ProvState::Idle;
            if (active) NimBLEDevice::getAdvertising()->start();
        }
        Serial.println("BLE: phone disconnected");
    }
};

class WifiCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic *c) override {
        if (state != ProvState::Confirmed) return;  // silently reject, never log the payload
        std::string raw = c->getValue();
        JsonDocument doc;
        if (deserializeJson(doc, raw) != DeserializationError::Ok) return;
        const char *s = doc["ssid"] | "";
        const char *p = doc["password"] | "";
        if (strlen(s) < 1 || strlen(s) > 32 || strlen(p) > 63) return;
        SecretsLock lock;
        ssid = s; password = p; hasCreds = true;
    }
};

class TokenCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic *c) override {
        if (state != ProvState::Confirmed) return;
        String t = String(c->getValue().c_str());
        t.trim();
        if (t.length() < 1 || t.length() > 128) return;
        SecretsLock lock;
        token = t; hasToken = true;
    }
};

class CommandCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic *c) override {
        String cmd = String(c->getValue().c_str());
        cmd.trim();

        if (cmd == "CANCEL") {
            clearSecrets();
            cancelPending = true;
            disconnectRequested = true;  // go back to advertising
        } else if (cmd == "CONNECT") {
            if (state != ProvState::Confirmed) return;
            bool ready;
            {
                SecretsLock lock;
                ready = hasToken && hasCreds;
                if (ready) connectPending = true;
            }
            if (!ready) {
                bleReportError("MISSING_INPUT", "Token or Wi-Fi credentials missing");
            }
        }
    }
};

void bleStart(const char *deviceId) {
    if (active) return;

    if (!secretsMutex) secretsMutex = xSemaphoreCreateMutex();

    String name = String("CaTch-") + deviceId;  // length is checked at compile time in main.cpp
    NimBLEDevice::init(name.c_str());
    NimBLEDevice::setMTU(512);

    // LE Secure Connections without bonding (keys are not kept after the connection);
    // no display → "Just Works" + physical SELECT confirmation
    NimBLEDevice::setSecurityAuth(false, false, true);
    NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

    server = NimBLEDevice::createServer();
    server->setCallbacks(new ServerCallbacks());
    server->advertiseOnDisconnect(false);  // advertising is restarted manually

    NimBLEService *svc = server->createService(SVC_UUID);

    NimBLECharacteristic *info = svc->createCharacteristic(INFO_UUID, NIMBLE_PROPERTY::READ);
    JsonDocument infoDoc;
    infoDoc["deviceId"] = deviceId;
    infoDoc["fw"] = FW_VERSION;
    infoDoc["proto"] = PROTO_VERSION;
    String infoJson;
    serializeJson(infoDoc, infoJson);
    info->setValue(std::string(infoJson.c_str()));

    statusChar = svc->createCharacteristic(
        STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    statusChar->setValue("{\"state\":\"IDLE\"}");

    // Sensitive characteristics require an encrypted link
    NimBLECharacteristic *wifi = svc->createCharacteristic(
        WIFI_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_ENC);
    wifi->setCallbacks(new WifiCallbacks());

    NimBLECharacteristic *tok = svc->createCharacteristic(
        TOKEN_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_ENC);
    tok->setCallbacks(new TokenCallbacks());

    NimBLECharacteristic *cmd = svc->createCharacteristic(CMD_UUID, NIMBLE_PROPERTY::WRITE);
    cmd->setCallbacks(new CommandCallbacks());

    svc->start();

    // Adv packet: flags + 128-bit service UUID. Scan response: the full name.
    NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
    NimBLEAdvertisementData advData, scanData;
    advData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
    advData.setCompleteServices(NimBLEUUID(SVC_UUID));
    scanData.setName(name.c_str());
    adv->setAdvertisementData(advData);
    adv->setScanResponseData(scanData);
    adv->start();

    state = ProvState::Idle;
    active = true;
    Serial.print("BLE provisioning advertising as ");
    Serial.println(name);
}

void bleStop() {
    if (!active) return;
    active = false;
    clearSecrets();
    NimBLEDevice::deinit(true);
    statusChar = nullptr;
    server = nullptr;
    state = ProvState::Idle;
    Serial.println("BLE provisioning stopped");
}

bool bleIsActive() { return active; }
ProvState bleState() { return state; }

void bleUpdate(uint32_t now) {
    if (!active) return;

    if (state == ProvState::WaitingConfirmation &&
        static_cast<int32_t>(now - confirmDeadline) >= 0) {
        publishStatus("ERROR", "CONFIRM_TIMEOUT", nullptr);
        disconnectRequested = true;
    }

    if (disconnectRequested) {
        disconnectRequested = false;
        if (server && connHandle != BLE_HS_CONN_HANDLE_NONE) {
            server->disconnect(connHandle);
        }
    }
}

void bleConfirmPressed() {
    if (active && state == ProvState::WaitingConfirmation) {
        bleSetState(ProvState::Confirmed);
        Serial.println("BLE: confirmed by SELECT");
    }
}

bool bleTakeConnectRequest(ProvisionRequest &out) {
    if (!secretsMutex) return false;
    SecretsLock lock;
    if (!connectPending) return false;
    connectPending = false;
    out.pairingToken = token;
    out.ssid = ssid;
    out.password = password;
    return true;
}

bool bleTakeCancel() {
    if (!cancelPending) return false;
    cancelPending = false;
    return true;
}
