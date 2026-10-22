#include <Arduino.h>
#include <secrets.h>

#include <MPU6050.h>
#include <Buttons.h>

constexpr uint8_t SDA_PIN = 8;
constexpr uint8_t SCL_PIN = 9;

constexpr uint8_t NEXT_PIN = 4;
constexpr uint8_t SELECT_PIN = 5;

constexpr uint32_t MOTION_INTERVAL_MS = 100;

void onNext(bool pressed) {
    Serial.print("Next ");
    Serial.println(pressed ? "pressed" : "released");
}

void onSelect(bool pressed) {
    Serial.print("Select ");
    Serial.println(pressed ? "pressed" : "released");
}

void setup() {
    Serial.begin(115200);

    Buttons::begin(NEXT_PIN, SELECT_PIN);

    MPU6050::begin(SDA_PIN, SCL_PIN);

    delay(100);

    Serial.println("MPU6050 and buttons starting...");
}

void loop() {
    const uint32_t now = millis();

    Buttons::update(now, onNext, onSelect);

    static bool initialized = false;

    if (!initialized) {
        initialized = MPU6050::initialize();

        if (!initialized) {
            Serial.println("MPU6050 init/I2C error; retrying");
            delay(1000);
            return;
        }

        Serial.println("MPU6050 ready (I2C 0x68)");
    }

    static uint32_t lastMotionPrint = 0;

    if (static_cast<uint32_t>(
            now - lastMotionPrint
        ) < MOTION_INTERVAL_MS) {
        return;
    }

    lastMotionPrint = now;

    MPU6050::MotionData motion{};

    if (!MPU6050::readMotion(motion)) {
        Serial.println("MPU6050 read error; reinitializing");
        initialized = false;
        return;
    }

    Serial.print("Accel [g]: ");
    Serial.print(motion.ax / 16384.0f, 3);
    Serial.print(", ");
    Serial.print(motion.ay / 16384.0f, 3);
    Serial.print(", ");
    Serial.print(motion.az / 16384.0f, 3);

    Serial.print(" | Gyro [deg/s]: ");
    Serial.print(motion.gx / 131.0f, 2);
    Serial.print(", ");
    Serial.print(motion.gy / 131.0f, 2);
    Serial.print(", ");
    Serial.println(motion.gz / 131.0f, 2);
}