from dataclasses import dataclass

import numpy as np


SAMPLING_RATE_HZ = 50

MIN_PLAUSIBLE_BPM = 30.0
MAX_PLAUSIBLE_BPM = 220.0
MIN_VALID_INTERVALS = 4
MIN_VALID_FRACTION = 0.6

MAX_DROPOUT_SAMPLES = 3
MIN_PULSE_SAMPLES = 2

LOW_BPM_LIMIT = 50.0
HIGH_BPM_LIMIT_AT_REST = 120.0
HIGH_BPM_LIMIT_ACTIVE = 150.0

POSSIBLE_HEALTH_CAUSE = "possible_health_cause"
NO_HEART_RATE_INDICATOR = "no_heart_rate_indicator"
UNKNOWN_CAUSE = "unknown"


@dataclass(frozen=True)
class CauseAssessment:
    cause: str
    reason: str
    bpm: float | None


def _clean_pulse(pulse: np.ndarray) -> np.ndarray:
    high = np.asarray(pulse) > 0
    high = _remove_short_runs(high, value=False, max_length=MAX_DROPOUT_SAMPLES)

    return _remove_short_runs(
        high,
        value=True,
        max_length=MIN_PULSE_SAMPLES - 1,
    )


def _remove_short_runs(
    signal: np.ndarray,
    value: bool,
    max_length: int,
) -> np.ndarray:
    if max_length <= 0 or len(signal) == 0:
        return signal

    signal = signal.copy()
    edges = np.flatnonzero(np.diff(signal)) + 1
    starts = np.r_[0, edges]
    ends = np.r_[edges, len(signal)]

    for start, end in zip(starts, ends):
        interior = start > 0 and end < len(signal)

        if interior and signal[start] == value and end - start <= max_length:
            signal[start:end] = not value

    return signal


def extract_beat_indices(pulse: np.ndarray) -> np.ndarray:
    high = _clean_pulse(pulse).astype(np.int8)

    return np.flatnonzero(np.diff(high) == 1) + 1


def estimate_bpm(
    pulse: np.ndarray,
    sampling_rate_hz: float = SAMPLING_RATE_HZ,
) -> float | None:
    beats = extract_beat_indices(pulse)

    if len(beats) < 2:
        return None

    intervals = np.diff(beats) / sampling_rate_hz
    valid = intervals[
        (intervals >= 60.0 / MAX_PLAUSIBLE_BPM)
        & (intervals <= 60.0 / MIN_PLAUSIBLE_BPM)
    ]

    if (
        len(valid) < MIN_VALID_INTERVALS
        or len(valid) / len(intervals) < MIN_VALID_FRACTION
    ):
        return None

    return float(60.0 / np.median(valid))


def assess_fall_cause(
    bpm: float | None,
    was_active: bool = False,
) -> CauseAssessment:
    if bpm is None:
        return CauseAssessment(
            UNKNOWN_CAUSE,
            "No reliable heart rate before the fall.",
            None,
        )

    if bpm < LOW_BPM_LIMIT:
        return CauseAssessment(
            POSSIBLE_HEALTH_CAUSE,
            f"Low heart rate before the fall ({bpm:.0f} BPM).",
            bpm,
        )

    high_limit = HIGH_BPM_LIMIT_ACTIVE if was_active else HIGH_BPM_LIMIT_AT_REST

    if bpm > high_limit:
        return CauseAssessment(
            POSSIBLE_HEALTH_CAUSE,
            f"High heart rate before the fall ({bpm:.0f} BPM).",
            bpm,
        )

    return CauseAssessment(
        NO_HEART_RATE_INDICATOR,
        f"Heart rate before the fall was in range ({bpm:.0f} BPM).",
        bpm,
    )
