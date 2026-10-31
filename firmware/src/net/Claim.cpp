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

ClaimResult claimDevice(const String &pairingToken, DeviceConfig &config, String &errorMessage) {
    const String url = String(API_BASE_URL) + "/api/v1/device-claims/claim";

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
        errorMessage = "http begin failed";
        return ClaimResult::NetworkError;
    }

    http.addHeader("Content-Type", "application/json");
    const int status = http.POST(payload);
    const String response = http.getString();
    http.end();

    if (status <= 0) {
        errorMessage = "server unreachable";
        return ClaimResult::NetworkError;
    }

    JsonDocument doc;
    const bool parsed = deserializeJson(doc, response) == DeserializationError::Ok;

    // DeviceClaimController currently answers 200 OK; accept any 2xx so a
    // switch to 201 Created on the backend does not break provisioning.
    if (status >= 200 && status < 300 && parsed) {
        const char *user = doc["mqttUsername"] | "";
        const char *pass = doc["mqttPassword"] | "";
        if (strlen(user) == 0 || strlen(pass) == 0) {
            errorMessage = "missing mqtt credentials in response";
            return ClaimResult::NetworkError;
        }
        config.mqttUsername = user;
        config.mqttPassword = pass;
        return ClaimResult::Ok;
    }

    if (status >= 400 && status < 500) {
        errorMessage = parsed ? String(doc["message"] | "claim rejected") : String("claim rejected");
        return ClaimResult::Rejected;
    }

    errorMessage = "server error " + String(status);
    return ClaimResult::NetworkError;
}
