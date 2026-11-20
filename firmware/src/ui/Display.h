#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include "MPU6050.h"
#include "net/BleProvisioning.h"

void beginDisplay(uint8_t sdaPin, uint8_t sclPin);
bool displayAvailable();
bool displaySoundEnabled();
uint8_t displayAddress();
void displayNext();
void displaySelect();

// Pairing question ("Pair this device?"). While shown it replaces every other
// screen; the answer comes from the buttons in main.cpp.
void displayShowPairingPrompt(const String &requestedBy, const String &email);
void displayHidePairingPrompt();
bool displayPairingPromptVisible();

// Draws a two-line status screen right away. Used before blocking network
// steps, during which updateDisplay() is not called.
void displayShowStatus(const char *title, const char *line);

void updateDisplay(uint32_t now, bool running, ProvState ble,
                bool wifiConnected, bool mqttConnected,
                   bool mpuReady, const MotionData *motion, uint32_t steps);

#endif
