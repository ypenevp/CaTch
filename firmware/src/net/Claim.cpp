#include "Claim.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <secrets.h>
#include <config.h>

WifiResult connectWifi(const String &ssid, const String &password, uint32_t timeoutMs) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(ssid.c_str(), password.c_str());

    const uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        const wl_status_t st = WiFi.status();
        WifiResult fail = WifiResult::Ok;
        if (st == WL_NO_SSID_AVAIL) fail = WifiResult::NotFound;
        else if (st == WL_CONNECT_FAILED) fail = WifiResult::AuthFailed;
        else if (static_cast<uint32_t>(millis() - start) > timeoutMs) fail = WifiResult::Timeout;

        if (fail != WifiResult::Ok) {
            WiFi.disconnect(true);
            return fail;
        }
        delay(250);
    }
    Serial.print("WiFi connected, IP: ");
    Serial.println(WiFi.localIP());
    return WifiResult::Ok;
}

// POSTs {deviceId, claimSecret, pairingToken} to /api/v1/device-claims/<action>.
// Returns the HTTP status (<= 0 when the server is unreachable).
static int postDeviceClaim(const char *action, const String &pairingToken, String &response) {
    const String url = String(API_BASE_URL) + "/api/v1/device-claims/" + action;

    JsonDocument body;
    body["deviceId"] = DEVICE_ID;
    body["claimSecret"] = CLAIM_SECRET;
    body["pairingToken"] = pairingToken;
    String payload;
    serializeJson(body, payload);

    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    HTTPClient http;
    http.setTimeout(HTTP_TIMEOUT_MS);

    bool began;
    if (url.startsWith("https://")) {
#ifdef API_ROOT_CA
        secureClient.setCACert(API_ROOT_CA);
#else
        secureClient.setInsecure();  // development only!
#endif
        began = http.begin(secureClient, url);
    } else {
        began = http.begin(plainClient, url);
    }
    if (!began) {
        return 0;
    }

    Serial.print("Claim: POST ");
    Serial.println(url);

    http.addHeader("Content-Type", "application/json");
    const int status = http.POST(payload);
    response = http.getString();
    http.end();

    // Responses may hold the MQTT credentials, so only the status is logged
    Serial.print("Claim: HTTP status ");
    Serial.println(status);
    return status;
}

// Maps a non-2xx answer to a ClaimResult and fills errorMessage.
static ClaimResult failureResult(int status, const String &response, const char *fallback,
                                 String &errorMessage) {
    if (status <= 0) {
        errorMessage = "server unreachable";
        return ClaimResult::NetworkError;
    }
    if (status >= 400 && status < 500) {
        JsonDocument doc;
        const bool parsed = deserializeJson(doc, response) == DeserializationError::Ok;
        errorMessage = parsed ? String(doc["message"] | fallback) : String(fallback);
        return ClaimResult::Rejected;
    }
    errorMessage = "server error " + String(status);
    return ClaimResult::NetworkError;
}

ClaimResult fetchPairingRequest(const String &pairingToken, PairingRequestInfo &info,
                                String &errorMessage) {
    String response;
    const int status = postDeviceClaim("pairing-request", pairingToken, response);

    if (status >= 200 && status < 300) {
        JsonDocument doc;
        if (deserializeJson(doc, response) != DeserializationError::Ok) {
            errorMessage = "invalid pairing request response";
            return ClaimResult::NetworkError;
        }
        info.requestedBy = String(doc["requestedBy"] | "");
        info.requestedByEmail = String(doc["requestedByEmail"] | "");
        Serial.println("Claim: pairing request received from the backend");
        return ClaimResult::Ok;
    }

    return failureResult(status, response, "pairing request rejected", errorMessage);
}

bool rejectPairingRequest(const String &pairingToken) {
    String response;
    const int status = postDeviceClaim("reject", pairingToken, response);
    return status >= 200 && status < 300;
}

ClaimResult claimDevice(const String &pairingToken, DeviceConfig &config, String &errorMessage) {
    String response;
    const int status = postDeviceClaim("claim", pairingToken, response);

    // DeviceClaimController currently answers 200 OK; accept any 2xx so a
    // switch to 201 Created on the backend does not break provisioning.
    if (status >= 200 && status < 300) {
        JsonDocument doc;
        const bool parsed = deserializeJson(doc, response) == DeserializationError::Ok;
        const char *user = parsed ? (doc["mqttUsername"] | "") : "";
        const char *pass = parsed ? (doc["mqttPassword"] | "") : "";
        if (strlen(user) == 0 || strlen(pass) == 0) {
            errorMessage = "missing mqtt credentials in response";
            return ClaimResult::NetworkError;
        }
        config.mqttUsername = user;
        config.mqttPassword = pass;
        Serial.println("Claim: device claimed, MQTT credentials received");
        return ClaimResult::Ok;
    }

    return failureResult(status, response, "claim rejected", errorMessage);
}
