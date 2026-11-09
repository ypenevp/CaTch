#ifndef BLE_PROVISIONING_H
#define BLE_PROVISIONING_H

#include <Arduino.h>

// Implements the "BLE Provisioning Protocol" v1 used by the CaTch app.

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
const char *bleStateName(ProvState state);

// SELECT accepts / NEXT rejects a phone that waits for confirmation
void bleConfirmPressed();
void bleRejectPressed();

// Non-blocking; each returns true once per event
bool bleTakeConnectRequest(ProvisionRequest &out);
bool bleTakeCancel();

// Notify STATUS. Reporting an error returns to Confirmed so the app can retry.
void bleSetState(ProvState state);
void bleReportError(const char *errorCode, const char *message);

#endif
