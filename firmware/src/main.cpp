
#include <Arduino.h>
#include <secrets.h>
#include <math.h>
#include <config.h>

#include <MPU6050.h>
#include <Buttons.h>
#include <Buzzer.h>

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
    Serial.begin(SERIAL_BAUD_RATE);
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

    // Инициализация на MPU6050
    if (!mpuInitialized) {
        mpuInitialized = initializeMPU6050();

        if (!mpuInitialized) {
            Serial.println("MPU6050 init/I2C error; retrying");
            delay(1000);
            return;
        }

        Serial.println("MPU6050 ready (I2C 0x68)");
    }

    // Интервал между измерванията
    if (static_cast<uint32_t>(
            now - lastMotionPrint
        ) < MOTION_INTERVAL_MS) {
        return;
    }

    lastMotionPrint = now;

    MotionData motion{};

    // Прочитане на данните от сензора
    if (!readMotion(motion)) {
        Serial.println("MPU6050 read error; reinitializing");

        mpuInitialized = false;
        havePrevious = false;

        return;
    }

    // Преобразуване към физически единици
    const float ax = motion.ax / ACCEL_SCALE;
    const float ay = motion.ay / ACCEL_SCALE;
    const float az = motion.az / ACCEL_SCALE;

    const float gx = motion.gx / GYRO_SCALE;
    const float gy = motion.gy / GYRO_SCALE;
    const float gz = motion.gz / GYRO_SCALE;

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
