#ifndef BLE_PROVISIONING_H
#define BLE_PROVISIONING_H

#include <Arduino.h>

// Implements the "BLE Provisioning Protocol" v1 (docs/ble-provisioning.md).

enum class ProvState {
    Idle,                 // advertising, no phone connected
    WaitingConfirmation,  // phone connected, waiting for SELECT
    Confirmed,
    WifiConnecting,
    Claiming,
    Done
};

struct ProvisionRequest {
    String pairingToken;
    String ssid;
    String password;
};

void bleStart(const char *deviceId);
void bleStop();
bool bleIsActive();
void bleUpdate(uint32_t now);   // confirmation timeout; call on every loop()
ProvState bleState();

// SELECT was pressed (safe to call even when no phone is connected)
void bleConfirmPressed();

// Non-blocking; return true once per event.
bool bleTakeConnectRequest(ProvisionRequest &out);
bool bleTakeCancel();

// Notify STATUS. Reporting an error automatically returns to Confirmed.
void bleSetState(ProvState state);
void bleReportError(const char *errorCode, const char *message = nullptr);

#endif
