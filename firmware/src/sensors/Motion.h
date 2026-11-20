#ifndef MOTION_H
#define MOTION_H

#include <Arduino.h>

// One motion reading in physical units
struct MotionSample {
    float ax, ay, az;   // g
    float gx, gy, gz;   // deg/s
    uint32_t timestampMs;
};

// Call on every loop(). Reads the MPU6050 every MOTION_INTERVAL_MS,
// retries the init if the sensor is missing and logs sudden motion.
// Returns true when a new sample was read.
bool motionUpdate(uint32_t now);

bool motionIsReady();
bool motionGetLatest(MotionSample &sample);

#endif
