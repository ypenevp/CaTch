#ifndef CONFIG_H
#define CONFIG_H

// ==================== FIRMWARE ====================

#define FW_VERSION "0.2.0"
#define BLE_PROTOCOL_VERSION 1

// ==================== SERIAL ====================

#define SERIAL_BAUD_RATE 115200

// ==================== PINS ====================

#define SDA_PIN 8
#define SCL_PIN 9

#define NEXT_PIN 4
#define SELECT_PIN 5

#define BUZZER_PIN 6

// ==================== I2C ====================

// 400 kHz: one full OLED frame takes ~25 ms instead of ~90 ms at 100 kHz
#define I2C_CLOCK_HZ 400000

// ==================== BUTTONS ====================

#define BUTTON_DEBOUNCE_MS 35
#define FACTORY_RESET_HOLD_MS 5000   // hold SELECT while powering on

// ==================== BUZZER ====================

// The pairing request sound repeats while the device waits for SELECT
#define PAIRING_PROMPT_INTERVAL_MS 5000

// ==================== DISPLAY (SSD1306) ====================

#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_ADDRESS_PRIMARY 0x3C
#define OLED_ADDRESS_SECONDARY 0x3D
#define DISPLAY_REFRESH_MS 200

// ==================== MPU6050 ====================

#define MPU6050_I2C_ADDRESS 0x68
#define MPU_RETRY_INTERVAL_MS 1000
#define MOTION_INTERVAL_MS 100

#define ACCEL_SCALE 16384.0f   // LSB per g at +-2 g
#define GYRO_SCALE 131.0f      // LSB per deg/s at +-250 deg/s

#define ACCEL_CHANGE_THRESHOLD 0.85f    // g between two samples
#define GYRO_CHANGE_THRESHOLD 100.0f    // deg/s between two samples

// ==================== VITALS (TEMPORARY) ====================

// Sent in every MQTT message until the pulse / SpO2 sensor is installed
#define FAKE_HEART_RATE 72
#define FAKE_SPO2 98.0f

// ==================== NETWORK ====================

#define WIFI_CONNECT_TIMEOUT_MS 20000
#define WIFI_RECONNECT_INTERVAL_MS 10000
#define HTTP_TIMEOUT_MS 15000

#define MQTT_PUBLISH_INTERVAL_MS 1000
#define MQTT_RECONNECT_INTERVAL_MS 5000
#define MQTT_KEEPALIVE_S 15
#define MQTT_SOCKET_TIMEOUT_S 5
#define MQTT_BUFFER_SIZE 384

// The network task runs on core 0 next to the Wi-Fi/BLE stacks;
// loop() (sensors, buttons, display) stays on core 1.
#define NETWORK_TASK_CORE 0
#define NETWORK_TASK_STACK_SIZE 8192
#define NETWORK_TASK_PRIORITY 1
#define NETWORK_TASK_PERIOD_MS 10

// ==================== BLE PROVISIONING ====================

#define BLE_CONFIRM_TIMEOUT_MS 60000
#define PROVISION_DONE_DELAY_MS 1500   // BLE stays on so the app reads DONE

// ==================== DEVICE ID ====================

// Backend rule (CreateDevicePairingRequest / RegisterFactoryDeviceRequest):
// ^[A-Za-z0-9_-]{8,64}$
#define DEVICE_ID_MIN_LENGTH 8
// BLE limit: the scan response name field holds 29 bytes and the name is
// "CaTch-" (6) + DEVICE_ID, so the ID can be at most 23 characters.
#define DEVICE_ID_MAX_LENGTH 23

#endif
