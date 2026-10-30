#ifndef MPU6050_H
#define MPU6050_H

#include <Arduino.h>

struct MotionData {
    int16_t ax, ay, az;
    int16_t gx, gy, gz;
};

bool beginMPU6050(uint8_t sdaPin, uint8_t sclPin);
bool initializeMPU6050();
bool readMotion(MotionData &data);

#endif