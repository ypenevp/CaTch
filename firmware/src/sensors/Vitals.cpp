#include "sensors/Vitals.h"

#include "config.h"

void vitalsRead(VitalsSample &sample) {
    sample.heartRate = FAKE_HEART_RATE;
    sample.spo2 = FAKE_SPO2;
    sample.simulated = true;
}
