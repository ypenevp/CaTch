#ifndef CONFIG_H
#define CONFIG_H
#include <Arduino.h>

// ==================== I2C PINS ====================

#define SDA_PIN 8
#define SCL_PIN 9

// ==================== BUTTON PINS ====================

#define NEXT_PIN 4
#define SELECT_PIN 5

// ==================== BUZZER ====================

#define BUZZER_PIN 6

#define BUZZER_COOLDOWN_MS 300
#define MOTION_BEEP_FREQ 2500
#define MOTION_BEEP_DURATION_MS 800

// ==================== MOTION DETECTION ====================

#define MOTION_INTERVAL_MS 100

#define ACCEL_CHANGE_THRESHOLD 0.85f
#define GYRO_CHANGE_THRESHOLD 100.0f

// ==================== NETWORK ====================

#define WIFI_CONNECT_TIMEOUT_MS 20000
#define HTTP_TIMEOUT_MS 15000
#define MQTT_PUBLISH_INTERVAL_MS 1000
#define FACTORY_RESET_HOLD_MS 5000   // hold SELECT while powering on

// ==================== DEVICE ID ====================

// Backend rule (CreateDevicePairingRequest / RegisterFactoryDeviceRequest):
// ^[A-Za-z0-9_-]{8,64}$
#define DEVICE_ID_MIN_LENGTH 8
// BLE limit: the scan response name field holds 29 bytes and the name is
// "CaTch-" (6) + DEVICE_ID, so the ID can be at most 23 characters.
#define DEVICE_ID_MAX_LENGTH 23

// ==================== SERIAL ====================

#define SERIAL_BAUD_RATE 115200

// ==================== MPU6050 ====================

#define MPU6050_I2C_ADDRESS 0x68
#define MPU_RETRY_INTERVAL_MS 1000

#define ACCEL_SCALE 16384.0f
#define GYRO_SCALE 131.0f

static bool mpuInitialized = false;
static bool havePrevious = false;

static float prevAx = 0.0f;
static float prevAy = 0.0f;
static float prevAz = 0.0f;

static float prevGx = 0.0f;
static float prevGy = 0.0f;
static float prevGz = 0.0f;

static uint32_t lastMotionPrint = 0;
static uint32_t lastMotionBeep = 0;
static uint32_t lastMqttPublish = 0;

#endif