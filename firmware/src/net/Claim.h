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

// Who asked the backend to pair with this device (shown on the screen).
struct PairingRequestInfo {
    String requestedBy;       // username
    String requestedByEmail;
};

WifiResult connectWifi(const String &ssid, const String &password, uint32_t timeoutMs);

// Asks the backend who created the pairing request behind pairingToken.
// Changes nothing on the server; the device is claimed only by claimDevice().
ClaimResult fetchPairingRequest(const String &pairingToken, PairingRequestInfo &info,
                                String &errorMessage);

// Tells the backend the user answered "no" on the device. Best effort.
bool rejectPairingRequest(const String &pairingToken);

// Sends deviceId + claimSecret + pairingToken. On success fills mqttUsername/mqttPassword.
ClaimResult claimDevice(const String &pairingToken, DeviceConfig &config, String &errorMessage);

#endif
