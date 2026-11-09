#include "net/BleProvisioning.h"

#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include "config.h"
#include "core/Log.h"

#define SVC_UUID    "8117f76e-7648-4b23-93ad-8dc887232b00"
#define INFO_UUID   "8117f76e-7648-4b23-93ad-8dc887232b01"
#define STATUS_UUID "8117f76e-7648-4b23-93ad-8dc887232b02"
#define WIFI_UUID   "8117f76e-7648-4b23-93ad-8dc887232b03"
#define TOKEN_UUID  "8117f76e-7648-4b23-93ad-8dc887232b04"
#define CMD_UUID    "8117f76e-7648-4b23-93ad-8dc887232b05"

#define BLE_MTU 512
#define STATUS_MESSAGE_MAX 80   // STATUS must stay <= 180 bytes
#define SSID_MAX_LENGTH 32
#define WIFI_PASSWORD_MAX_LENGTH 63
#define TOKEN_MAX_LENGTH 128

static NimBLEServer *server = NULL;
static NimBLECharacteristic *statusChar = NULL;
static bool active = false;

// Written from the NimBLE task (callbacks) and from loop()
static volatile ProvState state = ProvState::Idle;
static volatile uint16_t connHandle = BLE_HS_CONN_HANDLE_NONE;
static volatile uint32_t confirmDeadline = 0;
static volatile bool disconnectRequested = false;
static volatile bool cancelPending = false;

// Secrets from the phone, guarded by secretsMutex
static SemaphoreHandle_t secretsMutex = NULL;
static String token;
static String ssid;
static String password;
static bool hasToken = false;
static bool hasCreds = false;
static bool connectPending = false;

static void lockSecrets() {
    xSemaphoreTake(secretsMutex, portMAX_DELAY);
}

static void unlockSecrets() {
    xSemaphoreGive(secretsMutex);
}

static void clearSecrets() {
    lockSecrets();
    token = "";
    ssid = "";
    password = "";
    hasToken = false;
    hasCreds = false;
    connectPending = false;
    unlockSecrets();
}

const char *bleStateName(ProvState s) {
    switch (s) {
        case ProvState::WaitingConfirmation: return "WAITING_CONFIRMATION";
        case ProvState::Confirmed:           return "CONFIRMED";
        case ProvState::WifiConnecting:      return "WIFI_CONNECTING";
        case ProvState::Claiming:            return "CLAIMING";
        case ProvState::Done:                return "DONE";
        case ProvState::Idle:                return "IDLE";
    }
    return "IDLE";
}

static void publishStatus(const char *name, const char *error, const char *message) {
    if (statusChar == NULL) {
        return;
    }

    JsonDocument doc;
    doc["state"] = name;
    if (error != NULL) {
        doc["error"] = error;
    }
    if (message != NULL && message[0] != '\0') {
        String text = message;
        if (text.length() > STATUS_MESSAGE_MAX) {
            text = text.substring(0, STATUS_MESSAGE_MAX);
        }
        doc["message"] = text;
    }
    String json;
    serializeJson(doc, json);
    statusChar->setValue(std::string(json.c_str()));
    statusChar->notify();

    logPrintf("BLE", "STATUS sent: %s", json.c_str());
}

void bleSetState(ProvState s) {
    state = s;
    publishStatus(bleStateName(s), NULL, NULL);
}

void bleReportError(const char *errorCode, const char *message) {
    publishStatus("ERROR", errorCode, message);
    state = ProvState::Confirmed;
}

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer *s, ble_gap_conn_desc *desc) override {
        connHandle = desc->conn_handle;
        clearSecrets();
        confirmDeadline = millis() + BLE_CONFIRM_TIMEOUT_MS;
        logPrintf("BLE", "Phone connected (%s), waiting for SELECT",
                  NimBLEAddress(desc->peer_ota_addr).toString().c_str());
        bleSetState(ProvState::WaitingConfirmation);
    }

    void onDisconnect(NimBLEServer *s) override {
        connHandle = BLE_HS_CONN_HANDLE_NONE;
        clearSecrets();
        if (state != ProvState::Done) {
            state = ProvState::Idle;
            if (active) {
                NimBLEDevice::getAdvertising()->start();
            }
        }
        logPrintf("BLE", "Phone disconnected");
    }

    void onAuthenticationComplete(ble_gap_conn_desc *desc) override {
        logPrintf("BLE", desc->sec_state.encrypted ? "Link encrypted" : "Link encryption failed");
    }
};

class WifiCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic *c) override {
        if (state != ProvState::Confirmed) {
            logPrintf("BLE", "Wi-Fi credentials rejected: not confirmed");
            return;
        }
        std::string raw = c->getValue();
        JsonDocument doc;
        if (deserializeJson(doc, raw) != DeserializationError::Ok) {
            logPrintf("BLE", "Wi-Fi credentials rejected: invalid JSON");
            return;
        }
        const char *newSsid = doc["ssid"] | "";
        const char *newPassword = doc["password"] | "";
        if (strlen(newSsid) < 1 || strlen(newSsid) > SSID_MAX_LENGTH || strlen(newPassword) > WIFI_PASSWORD_MAX_LENGTH) {
            logPrintf("BLE", "Wi-Fi credentials rejected: invalid length");
            return;
        }
        lockSecrets();
        ssid = newSsid;
        password = newPassword;
        hasCreds = true;
        unlockSecrets();
        // The password is never logged
        logPrintf("BLE", "Wi-Fi credentials received for \"%s\"", newSsid);
    }
};

class TokenCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic *c) override {
        if (state != ProvState::Confirmed) {
            logPrintf("BLE", "Pairing token rejected: not confirmed");
            return;
        }
        String newToken = String(c->getValue().c_str());
        newToken.trim();
        if (newToken.length() < 1 || newToken.length() > TOKEN_MAX_LENGTH) {
            logPrintf("BLE", "Pairing token rejected: invalid length");
            return;
        }
        lockSecrets();
        token = newToken;
        hasToken = true;
        unlockSecrets();
        // The token itself is never logged
        logPrintf("BLE", "Pairing token received (%d chars)", newToken.length());
    }
};

class CommandCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic *c) override {
        String command = String(c->getValue().c_str());
        command.trim();
        logPrintf("BLE", "Command received: %s", command.c_str());

        if (command == "CANCEL") {
            clearSecrets();
            cancelPending = true;
            disconnectRequested = true;   // back to advertising
        } else if (command == "CONNECT") {
            if (state != ProvState::Confirmed) {
                logPrintf("BLE", "CONNECT ignored: not confirmed");
                return;
            }
            lockSecrets();
            bool ready = hasToken && hasCreds;
            if (ready) {
                connectPending = true;
            }
            unlockSecrets();
            if (!ready) {
                bleReportError("MISSING_INPUT", "Token or Wi-Fi credentials missing");
            }
        } else {
            logPrintf("BLE", "Unknown command ignored");
        }
    }
};

void bleStart(const char *deviceId) {
    if (active) {
        return;
    }
    if (secretsMutex == NULL) {
        secretsMutex = xSemaphoreCreateMutex();
    }

    String name = String("CaTch-") + deviceId;
    NimBLEDevice::init(name.c_str());
    NimBLEDevice::setMTU(BLE_MTU);

    // LE Secure Connections without bonding; no keypad on the bracelet,
    // so "Just Works" + the physical SELECT confirmation
    NimBLEDevice::setSecurityAuth(false, false, true);
    NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

    server = NimBLEDevice::createServer();
    server->setCallbacks(new ServerCallbacks());
    server->advertiseOnDisconnect(false);   // restarted manually in onDisconnect

    NimBLEService *service = server->createService(SVC_UUID);

    NimBLECharacteristic *info = service->createCharacteristic(INFO_UUID, NIMBLE_PROPERTY::READ);
    JsonDocument infoDoc;
    infoDoc["deviceId"] = deviceId;
    infoDoc["fw"] = FW_VERSION;
    infoDoc["proto"] = BLE_PROTOCOL_VERSION;
    String infoJson;
    serializeJson(infoDoc, infoJson);
    info->setValue(std::string(infoJson.c_str()));

    statusChar = service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    statusChar->setValue("{\"state\":\"IDLE\"}");

    // Sensitive characteristics require an encrypted link
    NimBLECharacteristic *wifi = service->createCharacteristic(WIFI_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_ENC);
    wifi->setCallbacks(new WifiCallbacks());

    NimBLECharacteristic *tokenChar = service->createCharacteristic(TOKEN_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_ENC);
    tokenChar->setCallbacks(new TokenCallbacks());

    NimBLECharacteristic *command = service->createCharacteristic(CMD_UUID, NIMBLE_PROPERTY::WRITE);
    command->setCallbacks(new CommandCallbacks());

    service->start();

    // Advertising packet: flags + 128-bit service UUID. Scan response: the full name.
    NimBLEAdvertising *advertising = NimBLEDevice::getAdvertising();
    NimBLEAdvertisementData advertisingData;
    NimBLEAdvertisementData scanData;
    advertisingData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
    advertisingData.setCompleteServices(NimBLEUUID(SVC_UUID));
    scanData.setName(name.c_str());
    advertising->setAdvertisementData(advertisingData);
    advertising->setScanResponseData(scanData);
    advertising->start();

    state = ProvState::Idle;
    active = true;
    logPrintf("BLE", "Advertising as %s (fw %s, protocol %d)", name.c_str(), FW_VERSION, BLE_PROTOCOL_VERSION);
}

void bleStop() {
    if (!active) {
        return;
    }
    active = false;
    clearSecrets();
    NimBLEDevice::deinit(true);
    statusChar = NULL;
    server = NULL;
    state = ProvState::Idle;
    logPrintf("BLE", "Stopped");
}

bool bleIsActive() {
    return active;
}

ProvState bleState() {
    return state;
}

void bleUpdate(uint32_t now) {
    if (!active) {
        return;
    }

    if (state == ProvState::WaitingConfirmation && (int32_t)(now - confirmDeadline) >= 0) {
        logPrintf("BLE", "No SELECT within %d s, disconnecting", BLE_CONFIRM_TIMEOUT_MS / 1000);
        publishStatus("ERROR", "CONFIRM_TIMEOUT", NULL);
        state = ProvState::Idle;   // report the timeout only once
        disconnectRequested = true;
    }

    if (disconnectRequested) {
        disconnectRequested = false;
        if (server != NULL && connHandle != BLE_HS_CONN_HANDLE_NONE) {
            server->disconnect(connHandle);
        }
    }
}

void bleConfirmPressed() {
    if (active && state == ProvState::WaitingConfirmation) {
        logPrintf("BLE", "Pairing confirmed with SELECT");
        bleSetState(ProvState::Confirmed);
    }
}

void bleRejectPressed() {
    if (active && state == ProvState::WaitingConfirmation) {
        logPrintf("BLE", "Pairing rejected with NEXT");
        clearSecrets();
        state = ProvState::Idle;
        disconnectRequested = true;
    }
}

bool bleTakeConnectRequest(ProvisionRequest &out) {
    if (secretsMutex == NULL) {
        return false;
    }
    lockSecrets();
    bool pending = connectPending;
    if (pending) {
        connectPending = false;
        out.pairingToken = token;
        out.ssid = ssid;
        out.password = password;
    }
    unlockSecrets();
    return pending;
}

bool bleTakeCancel() {
    if (!cancelPending) {
        return false;
    }
    cancelPending = false;
    return true;
}
