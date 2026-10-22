#include "MPU6050.h"
#include <Wire.h>

namespace {
    constexpr uint8_t MPU_ADDR = 0x68;

    bool writeRegister(uint8_t reg, uint8_t value) {
        Wire.beginTransmission(MPU_ADDR);
        Wire.write(reg);
        Wire.write(value);
        return Wire.endTransmission() == 0;
    }
}

bool MPU6050::begin(uint8_t sdaPin, uint8_t sclPin) {
    if (!Wire.begin(sdaPin, sclPin)) {
        return false;
    }

    Wire.setClock(100000);
    return true;
}

bool MPU6050::initialize() {
    return writeRegister(0x6B, 0x00) &&
           writeRegister(0x1C, 0x00) &&
           writeRegister(0x1B, 0x00);
}

bool MPU6050::readMotion(MotionData &data) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);

    if (Wire.endTransmission(false) != 0) {
        return false;
    }

    if (Wire.requestFrom(
            MPU_ADDR, static_cast<uint8_t>(14)) != 14) {
        return false;
    }

    int16_t values[7];

    for (int i = 0; i < 7; ++i) {
        uint8_t hi = Wire.read();
        uint8_t lo = Wire.read();

        values[i] = static_cast<int16_t>(
            (static_cast<uint16_t>(hi) << 8) | lo
        );
    }

    data.ax = values[0];
    data.ay = values[1];
    data.az = values[2];

    data.gx = values[4];
    data.gy = values[5];
    data.gz = values[6];

    return true;
}