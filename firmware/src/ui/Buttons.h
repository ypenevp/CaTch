#ifndef BUTTONS_H
#define BUTTONS_H

#include <Arduino.h>

// Called once per debounced change: pressed = true on press, false on release
typedef void (*ButtonCallback)(bool pressed);

void buttonsBegin(uint8_t nextPin, uint8_t selectPin);
void buttonsUpdate(uint32_t now, ButtonCallback onNext, ButtonCallback onSelect);

#endif
