#ifndef BUZZER_H
#define BUZZER_H

#include <Arduino.h>

// The buzzer only plays these notifications, never on its own.
enum class Sound {
    PairingRequest,   // a phone wants to pair (repeats while waiting for SELECT)
    Confirmed,        // SELECT accepted the pairing
    Rejected,         // NEXT rejected the pairing
    PairingSuccess,   // claimed by the backend, settings saved
    Connected,        // first MQTT connection after boot
    Error,            // Wi-Fi or claim failed
    FactoryReset      // stored settings cleared
};

void buzzerBegin(uint8_t pin);
void buzzerUpdate(uint32_t now);   // call on every loop()
void buzzerPlay(Sound sound);
void buzzerStop();

void buzzerSetEnabled(bool enabled);
bool buzzerIsEnabled();

#endif
