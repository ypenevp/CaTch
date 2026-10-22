#ifndef MPU6050_H
#define MPU6050_H

#include <Arduino.h>

namespace MPU6050 {

struct MotionData {
    int16_t ax, ay, az;
    int16_t gx, gy, gz;
};

bool begin(uint8_t sdaPin, uint8_t sclPin);
bool initialize();
bool readMotion(MotionData &data);

}

#endif