#ifndef VITALS_H
#define VITALS_H

#include <Arduino.h>

struct VitalsSample {
    int heartRate;     // bpm
    float spo2;        // %
    bool simulated;    // true while the values are hardcoded
};

// TEMPORARY: returns FAKE_HEART_RATE / FAKE_SPO2 from config.h until the
// pulse oximeter is installed. Only this function has to change then.
void vitalsRead(VitalsSample &sample);

#endif
