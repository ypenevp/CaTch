#ifndef BUTTONS_H
#define BUTTONS_H

#include <Arduino.h>

namespace Buttons {

using Callback = void (*)(bool pressed);

void begin(uint8_t nextPin, uint8_t selectPin);

void update(uint32_t now,
            Callback onNext,
            Callback onSelect);

}

#endif // BUTTONS_H