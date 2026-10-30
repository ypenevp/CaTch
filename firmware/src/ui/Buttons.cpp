#include "Buttons.h"

#define DEBOUNCE_MS 35

struct DebouncedButton {
    uint8_t pin;
    bool stablePressed;
    bool candidatePressed;
    uint32_t candidateSince;
};

DebouncedButton nextButton{};
DebouncedButton selectButton{};

void initializeButton(DebouncedButton &button, uint8_t pin) {
    button.pin = pin;
    pinMode(pin, INPUT_PULLUP);

    const bool pressed = digitalRead(pin) == LOW;

    button.stablePressed = pressed;
    button.candidatePressed = pressed;
    button.candidateSince = millis();
}

void updateButton(DebouncedButton &button, Callback onChange, uint32_t now) {
    const bool rawPressed = digitalRead(button.pin) == LOW;

    if (rawPressed != button.candidatePressed) {
        button.candidatePressed = rawPressed;
        button.candidateSince = now;
    }

    if (button.candidatePressed != button.stablePressed &&
        static_cast<uint32_t>(
            now - button.candidateSince
        ) >= DEBOUNCE_MS) {

        button.stablePressed = button.candidatePressed;

        if (onChange != nullptr) {
            onChange(button.stablePressed);
        }
    }
}

void beginButtons(uint8_t nextPin, uint8_t selectPin) {
    initializeButton(nextButton, nextPin);
    initializeButton(selectButton, selectPin);
}

void updateButtons(uint32_t now, Callback onNext, Callback onSelect) {
    updateButton(nextButton, onNext, now);
    updateButton(selectButton, onSelect, now);
}
