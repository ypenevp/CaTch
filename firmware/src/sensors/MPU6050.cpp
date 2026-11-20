#include "sensors/MPU6050.h"

#include <Wire.h>
#include "config.h"

#define MPU_REG_PWR_MGMT_1 0x6B
#define MPU_REG_ACCEL_CONFIG 0x1C
#define MPU_REG_GYRO_CONFIG 0x1B
#define MPU_REG_ACCEL_XOUT_H 0x3B
#define MPU_DATA_LENGTH 14

static bool writeRegister(uint8_t reg, uint8_t value) {
    Wire.beginTransmission(MPU6050_I2C_ADDRESS);
    Wire.write(reg);
    Wire.write(value);
    return Wire.endTransmission() == 0;
}

bool mpuInitialize() {
    // Wake up, +-2 g, +-250 deg/s
    return writeRegister(MPU_REG_PWR_MGMT_1, 0x00) &&
           writeRegister(MPU_REG_ACCEL_CONFIG, 0x00) &&
           writeRegister(MPU_REG_GYRO_CONFIG, 0x00);
}

bool mpuRead(MotionRaw &raw) {
    Wire.beginTransmission(MPU6050_I2C_ADDRESS);
    Wire.write(MPU_REG_ACCEL_XOUT_H);
    if (Wire.endTransmission(false) != 0) {
        return false;
    }

    if (Wire.requestFrom((uint8_t)MPU6050_I2C_ADDRESS, (uint8_t)MPU_DATA_LENGTH) != MPU_DATA_LENGTH) {
        return false;
    }

    int16_t values[7];
    for (int i = 0; i < 7; i++) {
        uint8_t high = Wire.read();
        uint8_t low = Wire.read();
        values[i] = (int16_t)((high << 8) | low);
    }

    // values[3] is the temperature, not used
    raw.ax = values[0];
    raw.ay = values[1];
    raw.az = values[2];
    raw.gx = values[4];
    raw.gy = values[5];
    raw.gz = values[6];
    return true;
}
