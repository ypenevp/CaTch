#include "ui/Buttons.h"

#include "config.h"

struct DebouncedButton {
    uint8_t pin;
    bool stablePressed;
    bool candidatePressed;
    uint32_t candidateSince;
};

static DebouncedButton nextButton;
static DebouncedButton selectButton;

static void initializeButton(DebouncedButton &button, uint8_t pin) {
    button.pin = pin;
    pinMode(pin, INPUT_PULLUP);   // pressed = LOW

    bool pressed = digitalRead(pin) == LOW;
    button.stablePressed = pressed;
    button.candidatePressed = pressed;
    button.candidateSince = millis();
}

static void updateButton(DebouncedButton &button, ButtonCallback onChange, uint32_t now) {
    bool rawPressed = digitalRead(button.pin) == LOW;

    if (rawPressed != button.candidatePressed) {
        button.candidatePressed = rawPressed;
        button.candidateSince = now;
    }

    bool changed = button.candidatePressed != button.stablePressed;
    bool stableLongEnough = (uint32_t)(now - button.candidateSince) >= BUTTON_DEBOUNCE_MS;
    if (changed && stableLongEnough) {
        button.stablePressed = button.candidatePressed;
        if (onChange != NULL) {
            onChange(button.stablePressed);
        }
    }
}

void buttonsBegin(uint8_t nextPin, uint8_t selectPin) {
    initializeButton(nextButton, nextPin);
    initializeButton(selectButton, selectPin);
}

void buttonsUpdate(uint32_t now, ButtonCallback onNext, ButtonCallback onSelect) {
    updateButton(nextButton, onNext, now);
    updateButton(selectButton, onSelect, now);
}
