#include "sensors/Motion.h"

#include <math.h>
#include "config.h"
#include "core/Log.h"
#include "sensors/MPU6050.h"

static bool sensorReady = false;
static bool initAttempted = false;
static uint32_t lastInitAttempt = 0;
static uint32_t lastRead = 0;

static bool haveSample = false;
static MotionSample latest;

static void checkSuddenMotion(const MotionSample &previous, const MotionSample &current) {
    float dax = current.ax - previous.ax;
    float day = current.ay - previous.ay;
    float daz = current.az - previous.az;
    float accelChange = sqrtf(dax * dax + day * day + daz * daz);

    float dgx = current.gx - previous.gx;
    float dgy = current.gy - previous.gy;
    float dgz = current.gz - previous.gz;
    float gyroChange = sqrtf(dgx * dgx + dgy * dgy + dgz * dgz);

    if (accelChange >= ACCEL_CHANGE_THRESHOLD || gyroChange >= GYRO_CHANGE_THRESHOLD) {
        logPrintf("MOTION", "Sudden motion: accel change %.3f g, gyro change %.1f deg/s",
                  accelChange, gyroChange);
    }
}

static bool tryInitialize(uint32_t now) {
    if (initAttempted && (uint32_t)(now - lastInitAttempt) < MPU_RETRY_INTERVAL_MS) {
        return false;
    }
    initAttempted = true;
    lastInitAttempt = now;

    sensorReady = mpuInitialize();
    if (sensorReady) {
        logPrintf("MOTION", "MPU6050 ready at I2C 0x%02X", MPU6050_I2C_ADDRESS);
    } else {
        logPrintf("MOTION", "MPU6050 not found at I2C 0x%02X, retrying in %d ms",
                  MPU6050_I2C_ADDRESS, MPU_RETRY_INTERVAL_MS);
    }
    return sensorReady;
}

bool motionUpdate(uint32_t now) {
    if (!sensorReady && !tryInitialize(now)) {
        return false;
    }

    if ((uint32_t)(now - lastRead) < MOTION_INTERVAL_MS) {
        return false;
    }
    lastRead = now;

    MotionRaw raw;
    if (!mpuRead(raw)) {
        logPrintf("MOTION", "MPU6050 read error, reinitializing");
        sensorReady = false;
        haveSample = false;
        return false;
    }

    MotionSample sample;
    sample.ax = raw.ax / ACCEL_SCALE;
    sample.ay = raw.ay / ACCEL_SCALE;
    sample.az = raw.az / ACCEL_SCALE;
    sample.gx = raw.gx / GYRO_SCALE;
    sample.gy = raw.gy / GYRO_SCALE;
    sample.gz = raw.gz / GYRO_SCALE;
    sample.timestampMs = now;

    if (haveSample) {
        checkSuddenMotion(latest, sample);
    }
    latest = sample;
    haveSample = true;
    return true;
}

bool motionIsReady() {
    return sensorReady;
}

bool motionGetLatest(MotionSample &sample) {
    if (!haveSample) {
        return false;
    }
    sample = latest;
    return true;
}
