#include "StepCounter.h"
#include <config.h>
#include <math.h>

// How it works:
//  1. |a| removes the dependence on how the device is held.
//  2. A slow average of |a| estimates gravity; subtracting it leaves only the
//     movement, which is then smoothed to remove sensor noise.
//  3. Every peak above an adaptive threshold (with hysteresis) is a step
//     candidate, if it comes STEP_MIN_INTERVAL_MS..STEP_MAX_INTERVAL_MS after the
//     previous one.
//  4. Steps are counted only after STEP_CONFIRM_COUNT regular candidates in a
//     row (no faster peaks in between), so single bumps, shaking and handling
//     the device do not count. The confirming
//     candidates are then added at once, so no steps are lost.

namespace {
bool initialized = false;
float gravity = 1.0f;       // slow average of |a|
float filtered = 0.0f;      // smoothed |a| - gravity
float peakAverage = 0.0f;   // average height of recent step peaks

bool inPeak = false;
float peakValue = 0.0f;
uint32_t peakTime = 0;

uint32_t lastCandidateTime = 0;
bool haveCandidate = false;
uint8_t pendingSteps = 0;   // regular candidates not counted yet
bool walking = false;

uint32_t steps = 0;

float threshold() {
    // Half of the typical peak, but never below the noise floor
    const float adaptive = peakAverage * STEP_ADAPTIVE_RATIO;
    return adaptive > STEP_MIN_THRESHOLD_G ? adaptive : STEP_MIN_THRESHOLD_G;
}

void stopWalking() {
    walking = false;
    pendingSteps = 0;
    haveCandidate = false;
}

void onPeak(float value, uint32_t time) {
    if (value > STEP_MAX_PEAK_G) {
        // A hit or a shake, not a step
        stopWalking();
        return;
    }

    if (haveCandidate) {
        const uint32_t interval = time - lastCandidateTime;
        if (interval < STEP_MIN_INTERVAL_MS) {
            // Faster than any step. While walking it is a second bump of the
            // same step; before the walk is confirmed it means shaking.
            if (!walking) stopWalking();
            return;
        }
        if (interval > STEP_MAX_INTERVAL_MS) {
            stopWalking();  // a pause: start a new walk with this peak
        }
    }

    peakAverage = peakAverage == 0.0f ? value : peakAverage + (value - peakAverage) * 0.2f;
    lastCandidateTime = time;
    haveCandidate = true;

    if (walking) {
        ++steps;
        return;
    }

    ++pendingSteps;
    if (pendingSteps >= STEP_CONFIRM_COUNT) {
        steps += pendingSteps;
        pendingSteps = 0;
        walking = true;
    }
}
}

void stepCounterUpdate(float ax, float ay, float az, uint32_t nowMs) {
    const float magnitude = sqrtf(ax * ax + ay * ay + az * az);

    if (!initialized) {
        gravity = magnitude;
        filtered = 0.0f;
        initialized = true;
        return;
    }

    gravity += (magnitude - gravity) * STEP_GRAVITY_ALPHA;
    filtered += ((magnitude - gravity) - filtered) * STEP_SMOOTH_ALPHA;

    const float high = threshold();
    if (!inPeak) {
        if (filtered > high) {
            inPeak = true;
            peakValue = filtered;
            peakTime = nowMs;
        }
    } else {
        if (filtered > peakValue) {
            peakValue = filtered;
            peakTime = nowMs;
        }
        if (filtered < high * 0.5f) {  // hysteresis: the peak is over
            inPeak = false;
            onPeak(peakValue, peakTime);
        }
    }

    // A long time without peaks ends the walk; forget the stale peak height
    if (haveCandidate && nowMs - lastCandidateTime > STEP_MAX_INTERVAL_MS) {
        stopWalking();
        peakAverage = 0.0f;
    }
}

uint32_t stepCount() { return steps; }

void stepCounterResetSignal() {
    initialized = false;
    inPeak = false;
    stopWalking();
}
