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
void updateDisplay(uint32_t now, bool running, ProvState ble,
                   bool wifiConnected, bool mqttConnected,
                   bool mpuReady, const MotionData *motion);

#endif
