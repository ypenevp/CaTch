#include "net/Claim.h"

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "secrets.h"
#include "config.h"
#include "core/Log.h"

#define WIFI_POLL_MS 250

// Blocking: runs only in the network task, never in loop()
WifiResult connectWifi(const String &ssid, const String &password, uint32_t timeoutMs) {
    logPrintf("WIFI", "Connecting to \"%s\" (timeout %lu ms)", ssid.c_str(), (unsigned long)timeoutMs);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(ssid.c_str(), password.c_str());

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        wl_status_t status = WiFi.status();
        WifiResult result = WifiResult::Ok;
        if (status == WL_NO_SSID_AVAIL) {
            result = WifiResult::NotFound;
        } else if (status == WL_CONNECT_FAILED) {
            result = WifiResult::AuthFailed;
        } else if ((uint32_t)(millis() - start) > timeoutMs) {
            result = WifiResult::Timeout;
        }

        if (result != WifiResult::Ok) {
            logPrintf("WIFI", "Connection failed: %s (status %d)",
                      result == WifiResult::NotFound ? "network not found"
                      : result == WifiResult::AuthFailed ? "wrong password"
                      : "timeout",
                      (int)status);
            WiFi.disconnect(true);
            return result;
        }
        delay(WIFI_POLL_MS);
    }

    logPrintf("WIFI", "Connected to \"%s\", IP %s, RSSI %d dBm",
              ssid.c_str(), WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return WifiResult::Ok;
}

// Blocking: runs only in the network task, never in loop()
ClaimResult claimDevice(const String &pairingToken, DeviceConfig &config, String &errorMessage) {
    String url = String(API_BASE_URL) + "/api/v1/device-claims/claim";

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
        logPrintf("CLAIM", "HTTP begin failed for %s", url.c_str());
        return ClaimResult::NetworkError;
    }

    // The body holds the claim secret and the token, so only the URL is logged
    logPrintf("CLAIM", "POST %s", url.c_str());
    http.addHeader("Content-Type", "application/json");
    int status = http.POST(payload);
    String response = http.getString();
    http.end();

    // The response holds the MQTT credentials, so only the status is logged
    logPrintf("CLAIM", "HTTP status %d, %d bytes received", status, response.length());

    if (status <= 0) {
        errorMessage = "server unreachable";
        logPrintf("CLAIM", "Server unreachable (%s)", HTTPClient::errorToString(status).c_str());
        return ClaimResult::NetworkError;
    }

    JsonDocument doc;
    bool parsed = deserializeJson(doc, response) == DeserializationError::Ok;

    // DeviceClaimController answers 200 OK; any 2xx is accepted
    if (status >= 200 && status < 300 && parsed) {
        const char *user = doc["mqttUsername"] | "";
        const char *pass = doc["mqttPassword"] | "";
        if (strlen(user) == 0 || strlen(pass) == 0) {
            errorMessage = "missing mqtt credentials in response";
            logPrintf("CLAIM", "Response has no MQTT credentials");
            return ClaimResult::NetworkError;
        }
        config.mqttUsername = user;
        config.mqttPassword = pass;
        logPrintf("CLAIM", "Device claimed, MQTT credentials received");
        return ClaimResult::Ok;
    }

    if (status >= 400 && status < 500) {
        errorMessage = parsed ? String(doc["message"] | "claim rejected") : String("claim rejected");
        logPrintf("CLAIM", "Claim rejected: %s", errorMessage.c_str());
        return ClaimResult::Rejected;
    }

    errorMessage = "server error " + String(status);
    logPrintf("CLAIM", "Server error %d", status);
    return ClaimResult::NetworkError;
}
