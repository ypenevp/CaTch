#ifndef BUTTONS_H
#define BUTTONS_H

#include <Arduino.h>

using Callback = void (*)(bool pressed);

void beginButtons(uint8_t nextPin, uint8_t selectPin);

void updateButtons(uint32_t now, Callback onNext, Callback onSelect);

#endif
