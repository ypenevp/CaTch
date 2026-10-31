#ifndef CLAIM_H
#define CLAIM_H

#include <Arduino.h>
#include "DeviceStorage.h"

enum class WifiResult { Ok, NotFound, AuthFailed, Timeout };

enum class ClaimResult {
    Ok,
    Rejected,      // 4xx from the server -> CLAIM_REJECTED
    NetworkError   // unreachable / timeout / 5xx -> CLAIM_NETWORK
};

WifiResult connectWifi(const String &ssid, const String &password, uint32_t timeoutMs);

// Sends deviceId + claimSecret + pairingToken. On success fills mqttUsername/mqttPassword.
ClaimResult claimDevice(const String &pairingToken, DeviceConfig &config, String &errorMessage);

#endif
