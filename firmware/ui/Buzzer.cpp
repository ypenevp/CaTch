#include "Buzzer.h"

namespace Buzzer {

    static uint8_t buzzerPin = 255;
    static bool initialized = false;
    static bool timedBeep = false;
    static uint32_t beepStarted = 0;
    static uint32_t beepDuration = 0;

    void begin(uint8_t pin) {
        buzzerPin = pin;

        pinMode(buzzerPin, OUTPUT);
        digitalWrite(buzzerPin, LOW);

        initialized = true;
        timedBeep = false;
    }

    void on(uint16_t frequency) {
        if (!initialized) {
            return;
        }

        timedBeep = false;

        // For passive buzzers on boards supporting tone()
        tone(buzzerPin, frequency);
    }

    void off() {
        if (!initialized) {
            return;
        }

        timedBeep = false;

        noTone(buzzerPin);
        digitalWrite(buzzerPin, LOW);
    }

    void beep(uint16_t frequency, uint32_t durationMs) {
        if (!initialized) {
            return;
        }

        tone(buzzerPin, frequency);

        beepStarted = millis();
        beepDuration = durationMs;
        timedBeep = true;
    }

    void update(uint32_t now) {
        if (!initialized || !timedBeep) {
            return;
        }

        if (static_cast<uint32_t>(
                now - beepStarted
            ) >= beepDuration) {
            off();
        }
    }
}