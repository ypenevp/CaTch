#ifndef BUZZER_H
#define BUZZER_H
#include <Arduino.h>

namespace Buzzer {

    void begin(uint8_t pin);

    void on(uint16_t frequency = 2000);
    void off();

    void beep(
        uint16_t frequency = 2000,
        uint32_t durationMs = 100
    );

    void update(uint32_t now);
}
#endif