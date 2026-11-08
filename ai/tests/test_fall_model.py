import unittest

import numpy as np
import torch

from src.ml.data.labels import ACTIVITY_TO_ID, FALL_ID, STILL_ID
from src.ml.data.windowing import create_activity_windows
from src.ml.engines.evaluator import apply_fall_threshold
from src.ml.models.fall_net import FallNet
from src.ml.utils.heart import (
    NO_HEART_RATE_INDICATOR,
    POSSIBLE_HEALTH_CAUSE,
    UNKNOWN_CAUSE,
    assess_fall_cause,
    estimate_bpm,
    extract_beat_indices,
)


def pulse_train(period: int, length: int = 500, width: int = 10) -> np.ndarray:
    pulse = np.zeros(length, dtype=np.int64)

    for start in range(period, length - width, period):
        pulse[start:start + width] = 1023

    return pulse


class TestActivityWindows(unittest.TestCase):
    def fall_recording(self, impact: int = 400, length: int = 800):
        raw = np.zeros((length, 6), dtype=np.float32)
        raw[impact, 0] = 15.0
        raw[impact - 30:impact + 30, 3] = 200.0

        return raw

    def test_only_impact_windows_are_labelled_fall(self):
        raw = self.fall_recording()
        _, labels = create_activity_windows(raw, raw, FALL_ID)

        self.assertEqual(int((labels == FALL_ID).sum()), 1)
        self.assertTrue(np.isin(labels, [FALL_ID, STILL_ID]).all())
        self.assertGreater(int((labels == STILL_ID).sum()), 5)

    def test_fall_stride_adds_impact_centred_windows(self):
        raw = self.fall_recording()
        _, labels = create_activity_windows(raw, raw, FALL_ID, fall_stride=5)

        self.assertEqual(int((labels == FALL_ID).sum()), 8)

    def test_quiet_activity_windows_become_still(self):
        walking = ACTIVITY_TO_ID["walking"]
        raw = np.zeros((400, 6), dtype=np.float32)
        raw[:200, 0] = 1.0

        _, labels = create_activity_windows(raw, raw, walking)

        self.assertEqual(labels[0], walking)
        self.assertEqual(labels[-1], STILL_ID)


class TestFallThreshold(unittest.TestCase):
    def test_fall_below_threshold_uses_next_best_class(self):
        probabilities = np.zeros((2, 8), dtype=np.float32)
        probabilities[0, [ACTIVITY_TO_ID["walking"], FALL_ID]] = [0.3, 0.7]
        probabilities[1, [ACTIVITY_TO_ID["walking"], FALL_ID]] = [0.1, 0.9]

        predictions = apply_fall_threshold(probabilities, 0.8)

        self.assertEqual(predictions[0], ACTIVITY_TO_ID["walking"])
        self.assertEqual(predictions[1], FALL_ID)


class TestFallNet(unittest.TestCase):
    def test_output_shape(self):
        model = FallNet()
        model.eval()

        output = model(torch.zeros(4, 75, 6))

        self.assertEqual(output.shape, (4, 8))

    def test_handles_extreme_inputs(self):
        model = FallNet()
        model.eval()

        output = model(torch.full((2, 75, 6), 500.0))

        self.assertTrue(torch.isfinite(output).all())


class TestHeartRate(unittest.TestCase):
    def test_period_converts_to_bpm(self):
        self.assertAlmostEqual(estimate_bpm(pulse_train(50)), 60.0)
        self.assertAlmostEqual(estimate_bpm(pulse_train(25)), 120.0)

    def test_short_dropout_is_not_a_beat(self):
        pulse = pulse_train(50)
        pulse[55] = 0

        self.assertEqual(
            len(extract_beat_indices(pulse)),
            len(extract_beat_indices(pulse_train(50))),
        )
        self.assertAlmostEqual(estimate_bpm(pulse), 60.0)

    def test_flat_signal_has_no_bpm(self):
        self.assertIsNone(estimate_bpm(np.zeros(500)))

    def test_cause_screen(self):
        self.assertEqual(assess_fall_cause(None).cause, UNKNOWN_CAUSE)
        self.assertEqual(assess_fall_cause(42.0).cause, POSSIBLE_HEALTH_CAUSE)
        self.assertEqual(assess_fall_cause(75.0).cause, NO_HEART_RATE_INDICATOR)
        self.assertEqual(assess_fall_cause(140.0).cause, POSSIBLE_HEALTH_CAUSE)
        self.assertEqual(
            assess_fall_cause(140.0, was_active=True).cause,
            NO_HEART_RATE_INDICATOR,
        )


if __name__ == "__main__":
    unittest.main()
