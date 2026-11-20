#ifndef STEP_COUNTER_H
#define STEP_COUNTER_H

#include <Arduino.h>

// Pedometer on the accelerometer magnitude. Call stepCounterUpdate() with every
// sample (ideally every STEP_SAMPLE_INTERVAL_MS) with acceleration in g.
void stepCounterUpdate(float ax, float ay, float az, uint32_t nowMs);

// Steps since power-on.
uint32_t stepCount();

// Forget the signal history (e.g. after a sensor error); keeps the count.
void stepCounterResetSignal();

#endif
