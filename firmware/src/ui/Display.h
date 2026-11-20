#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include "net/BleProvisioning.h"
#include "net/NetworkTask.h"
#include "sensors/Motion.h"
#include "sensors/Vitals.h"

// Everything the screens show, collected by main.cpp once per loop
struct DisplayData {
    bool running;                    // false = provisioning (pairing) mode
    ProvState bleState;
    ProvisionStage provisionStage;
    bool wifiConnected;
    bool mqttConnected;
    bool motionReady;
    bool hasMotion;
    MotionSample motion;
    VitalsSample vitals;
    bool soundEnabled;
};

// What main.cpp has to do after a button press on the display
enum class DisplayAction {
    None,
    ToggleSound
};

// The I2C bus (Wire) must already be started; it is shared with the MPU6050.
bool displayBegin();
bool displayAvailable();
void displayUpdate(uint32_t now, const DisplayData &data);

// Menu navigation: NEXT moves / goes back, SELECT opens / toggles
DisplayAction displayNext();
DisplayAction displaySelect();

#endif
