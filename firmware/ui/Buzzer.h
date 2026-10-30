#ifndef BUZZER_H
#define BUZZER_H

#include <Arduino.h>

void beginBuzzer(uint8_t pin);
void buzzerOn(uint16_t frequency);
void buzzerOff();
void beep(uint16_t frequency, uint32_t durationMs);
void updateBuzzer(uint32_t now);

#endif
