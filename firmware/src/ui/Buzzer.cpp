#include "ui/Buzzer.h"

#include "core/Log.h"

// One step of a sound. frequency 0 = silence.
struct ToneStep {
    uint16_t frequency;
    uint16_t durationMs;
};

static const ToneStep PAIRING_REQUEST_STEPS[] = {{1800, 120}, {0, 90}, {1800, 120}};
static const ToneStep CONFIRMED_STEPS[] = {{2200, 100}};
static const ToneStep REJECTED_STEPS[] = {{900, 220}};
static const ToneStep PAIRING_SUCCESS_STEPS[] = {{1500, 100}, {0, 50}, {2000, 100}, {0, 50}, {2500, 160}};
static const ToneStep CONNECTED_STEPS[] = {{2000, 80}, {0, 60}, {2500, 80}};
static const ToneStep ERROR_STEPS[] = {{700, 200}, {0, 80}, {700, 200}};
static const ToneStep FACTORY_RESET_STEPS[] = {{1000, 400}};

#define STEP_COUNT(steps) (sizeof(steps) / sizeof(steps[0]))

static uint8_t buzzerPin = 255;
static bool initialized = false;
static bool enabled = true;

static const ToneStep *currentSteps = NULL;
static uint8_t currentCount = 0;
static uint8_t currentIndex = 0;
static uint32_t stepStarted = 0;

static void outputStep(const ToneStep &step) {
    if (step.frequency == 0) {
        noTone(buzzerPin);
        digitalWrite(buzzerPin, LOW);
    } else {
        tone(buzzerPin, step.frequency);
    }
}

static const char *soundName(Sound sound) {
    switch (sound) {
        case Sound::PairingRequest: return "pairing request";
        case Sound::Confirmed:      return "confirmed";
        case Sound::Rejected:       return "rejected";
        case Sound::PairingSuccess: return "pairing success";
        case Sound::Connected:      return "connected";
        case Sound::Error:          return "error";
        case Sound::FactoryReset:   return "factory reset";
    }
    return "unknown";
}

void buzzerBegin(uint8_t pin) {
    buzzerPin = pin;
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);
    initialized = true;
    logPrintf("BUZZER", "Ready on GPIO %d", pin);
}

void buzzerStop() {
    if (!initialized) {
        return;
    }
    noTone(buzzerPin);
    digitalWrite(buzzerPin, LOW);
    currentSteps = NULL;
    currentCount = 0;
    currentIndex = 0;
}

void buzzerPlay(Sound sound) {
    if (!initialized) {
        return;
    }
    if (!enabled) {
        logPrintf("BUZZER", "Muted: %s", soundName(sound));
        return;
    }

    const ToneStep *steps = NULL;
    uint8_t count = 0;
    switch (sound) {
        case Sound::PairingRequest: steps = PAIRING_REQUEST_STEPS; count = STEP_COUNT(PAIRING_REQUEST_STEPS); break;
        case Sound::Confirmed:      steps = CONFIRMED_STEPS;       count = STEP_COUNT(CONFIRMED_STEPS); break;
        case Sound::Rejected:       steps = REJECTED_STEPS;        count = STEP_COUNT(REJECTED_STEPS); break;
        case Sound::PairingSuccess: steps = PAIRING_SUCCESS_STEPS; count = STEP_COUNT(PAIRING_SUCCESS_STEPS); break;
        case Sound::Connected:      steps = CONNECTED_STEPS;       count = STEP_COUNT(CONNECTED_STEPS); break;
        case Sound::Error:          steps = ERROR_STEPS;           count = STEP_COUNT(ERROR_STEPS); break;
        case Sound::FactoryReset:   steps = FACTORY_RESET_STEPS;   count = STEP_COUNT(FACTORY_RESET_STEPS); break;
    }

    logPrintf("BUZZER", "Play: %s", soundName(sound));
    currentSteps = steps;
    currentCount = count;
    currentIndex = 0;
    stepStarted = millis();
    outputStep(currentSteps[0]);
}

void buzzerUpdate(uint32_t now) {
    if (!initialized || currentSteps == NULL) {
        return;
    }
    if ((uint32_t)(now - stepStarted) < currentSteps[currentIndex].durationMs) {
        return;
    }

    currentIndex++;
    if (currentIndex >= currentCount) {
        buzzerStop();
        return;
    }
    stepStarted = now;
    outputStep(currentSteps[currentIndex]);
}

void buzzerSetEnabled(bool value) {
    enabled = value;
    if (!enabled) {
        buzzerStop();
    }
    logPrintf("BUZZER", "Sound %s", enabled ? "ON" : "OFF");
}

bool buzzerIsEnabled() {
    return enabled;
}
