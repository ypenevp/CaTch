#ifndef MPU6050_H
#define MPU6050_H

#include <Arduino.h>

// Raw register values from the MPU6050 (before scaling to g / deg/s)
struct MotionRaw {
    int16_t ax, ay, az;
    int16_t gx, gy, gz;
};

// The I2C bus (Wire) must already be started; it is shared with the display.
bool mpuInitialize();
bool mpuRead(MotionRaw &raw);

#endif
