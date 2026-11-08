from dataclasses import asdict
from pathlib import Path

import numpy as np
import torch

from src.ml.data.labels import ACTIVITY_CLASSES, ACTIVITY_TO_ID, FALL_ID
from src.ml.data.windowing import FALL_EVENT_BEFORE, sliding_windows
from src.ml.engines.evaluator import apply_fall_threshold
from src.ml.engines.trainer import predict_probabilities
from src.ml.models.fall_net import FallNet
from src.ml.utils.heart import assess_fall_cause, estimate_bpm


INFERENCE_STRIDE = 25

ACTIVE_CLASS_IDS = {
    ACTIVITY_TO_ID["walking"],
    ACTIVITY_TO_ID["stairs"],
}


def save_checkpoint(
    path: str | Path,
    model: FallNet,
    scaler,
    feature_columns: list[str],
    window_size: int,
    sampling_rate_hz: int,
    fall_threshold: float,
) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "scaler_mean": scaler.mean_.tolist(),
            "scaler_scale": scaler.scale_.tolist(),
            "feature_columns": feature_columns,
            "activity_classes": ACTIVITY_CLASSES,
            "window_size": window_size,
            "sampling_rate_hz": sampling_rate_hz,
            "fall_threshold": fall_threshold,
        },
        path,
    )


class FallDetector:
    def __init__(
        self,
        checkpoint_path: str | Path,
        device: str = "cpu",
    ) -> None:
        checkpoint = torch.load(
            checkpoint_path,
            map_location=device,
            weights_only=True,
        )

        self.device = device
        self.mean = np.asarray(checkpoint["scaler_mean"], dtype=np.float32)
        self.scale = np.asarray(checkpoint["scaler_scale"], dtype=np.float32)
        self.classes = checkpoint["activity_classes"]
        self.window_size = checkpoint["window_size"]
        self.sampling_rate_hz = checkpoint["sampling_rate_hz"]
        self.fall_threshold = checkpoint["fall_threshold"]

        self.model = FallNet(
            in_features=len(checkpoint["feature_columns"]),
            num_classes=len(self.classes),
        ).to(device)
        self.model.load_state_dict(checkpoint["state_dict"])
        self.model.eval()

    def analyze(
        self,
        samples: np.ndarray,
        pulse: np.ndarray | None = None,
        bpm: float | None = None,
    ) -> dict:
        samples = np.asarray(samples, dtype=np.float32)
        windows, starts = sliding_windows(
            (samples - self.mean) / self.scale,
            window_size=self.window_size,
            stride=INFERENCE_STRIDE,
        )

        if len(windows) == 0:
            raise ValueError(
                f"At least {self.window_size} samples are required."
            )

        probabilities = predict_probabilities(
            self.model,
            windows,
            device=self.device,
        )
        predictions = apply_fall_threshold(probabilities, self.fall_threshold)

        timeline = [
            {
                "start_seconds": float(start / self.sampling_rate_hz),
                "activity": self.classes[prediction],
                "fall_probability": float(probability[FALL_ID]),
            }
            for start, prediction, probability in zip(
                starts,
                predictions,
                probabilities,
            )
        ]

        fall_indices = np.flatnonzero(predictions == FALL_ID)
        result = {
            "fall_detected": len(fall_indices) > 0,
            "fall_probability": float(probabilities[:, FALL_ID].max()),
            "timeline": timeline,
            "fall_time_seconds": None,
            "fall_assessment": None,
        }

        if len(fall_indices) == 0:
            return result

        best = fall_indices[probabilities[fall_indices, FALL_ID].argmax()]
        start = int(starts[best])
        accel = np.linalg.norm(samples[start:start + self.window_size, :3], axis=1)
        impact = start + int(accel.argmax())
        pre_fall_end = max(0, impact - FALL_EVENT_BEFORE)

        estimated_bpm = None

        if pulse is not None:
            estimated_bpm = estimate_bpm(
                np.asarray(pulse)[:pre_fall_end],
                self.sampling_rate_hz,
            )

        was_active = bool(
            set(
                predictions[
                    starts + self.window_size <= pre_fall_end
                ].tolist()
            )
            & ACTIVE_CLASS_IDS
        )

        result["fall_time_seconds"] = impact / self.sampling_rate_hz
        result["fall_assessment"] = asdict(
            assess_fall_cause(
                estimated_bpm if estimated_bpm is not None else bpm,
                was_active=was_active,
            )
        )

        return result
