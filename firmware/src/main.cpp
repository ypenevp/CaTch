#include <Arduino.h>
#include <secrets.h>
#include <math.h>

#include <MPU6050.h>
#include <Buttons.h>
#include <Buzzer.h>

#define SDA_PIN 8
#define SCL_PIN 9

#define NEXT_PIN 4
#define SELECT_PIN 5
#define BUZZER_PIN 6

#define MOTION_INTERVAL_MS 100

#define ACCEL_CHANGE_THRESHOLD 0.85f
#define GYRO_CHANGE_THRESHOLD 100.0f

#define BUZZER_COOLDOWN_MS 300

#define MOTION_BEEP_FREQ 2500
#define MOTION_BEEP_DURATION_MS 800

void onNext(bool pressed) {
    Serial.print("Next ");
    Serial.println(pressed ? "pressed" : "released");

    if (pressed) {
        beep(2000, 60);
    }
}

void onSelect(bool pressed) {
    Serial.print("Select ");
    Serial.println(pressed ? "pressed" : "released");

    if (pressed) {
        beep(2800, 120);
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    beginButtons(NEXT_PIN, SELECT_PIN);
    beginBuzzer(BUZZER_PIN);
    beginMPU6050(SDA_PIN, SCL_PIN);

    Serial.println("MPU6050, buttons and buzzer starting...");
}
void loop() {
    const uint32_t now = millis();

    updateButtons(now, onNext, onSelect);
    updateBuzzer(now);

    static bool initialized = false;

    if (!initialized) {
        initialized = initializeMPU6050();

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

    MotionData motion{};

    if (!readMotion(motion)) {
        Serial.println("MPU6050 read error; reinitializing");
        initialized = false;
        return;
    }

    // Преобразуване към физически единици
    const float ax = motion.ax / 16384.0f;
    const float ay = motion.ay / 16384.0f;
    const float az = motion.az / 16384.0f;

    const float gx = motion.gx / 131.0f;
    const float gy = motion.gy / 131.0f;
    const float gz = motion.gz / 131.0f;

    // Предишно измерване
    static bool havePrevious = false;

    static float prevAx = 0.0f;
    static float prevAy = 0.0f;
    static float prevAz = 0.0f;

    static float prevGx = 0.0f;
    static float prevGy = 0.0f;
    static float prevGz = 0.0f;

    static uint32_t lastMotionBeep = 0;

    if (havePrevious) {
        // Промяна на вектора на ускорението (g)
        const float dax = ax - prevAx;
        const float day = ay - prevAy;
        const float daz = az - prevAz;

        const float accelChange = sqrtf(
            dax * dax + day * day + daz * daz
        );

        // Промяна на вектора на ъгловата скорост (deg/s)
        const float dgx = gx - prevGx;
        const float dgy = gy - prevGy;
        const float dgz = gz - prevGz;

        const float gyroChange = sqrtf(
            dgx * dgx + dgy * dgy + dgz * dgz
        );

        const bool suddenAcceleration =
            accelChange >= ACCEL_CHANGE_THRESHOLD;

        const bool suddenRotation =
            gyroChange >= GYRO_CHANGE_THRESHOLD;

        const bool cooldownPassed =
            static_cast<uint32_t>(
                now - lastMotionBeep
            ) >= BUZZER_COOLDOWN_MS;

        if ((suddenAcceleration || suddenRotation)
            && cooldownPassed) {

            beep(
                MOTION_BEEP_FREQ,
                MOTION_BEEP_DURATION_MS
            );

            lastMotionBeep = now;

            Serial.print("SUDDEN MOTION! Accel change: ");
            Serial.print(accelChange, 3);
            Serial.print(" g | Gyro change: ");
            Serial.print(gyroChange, 2);
            Serial.println(" deg/s");
        }
    }

    // Запазване на текущите стойности
    prevAx = ax;
    prevAy = ay;
    prevAz = az;

    prevGx = gx;
    prevGy = gy;
    prevGz = gz;

    havePrevious = true;

    // Отпечатване на измерванията
    Serial.print("Accel [g]: ");
    Serial.print(ax, 3);
    Serial.print(", ");
    Serial.print(ay, 3);
    Serial.print(", ");
    Serial.print(az, 3);

    Serial.print(" | Gyro [deg/s]: ");
    Serial.print(gx, 2);
    Serial.print(", ");
    Serial.print(gy, 2);
    Serial.print(", ");
    Serial.println(gz, 2);
}
