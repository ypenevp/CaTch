import numpy as np
import pandas as pd
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.preprocessing import StandardScaler
from torch import nn

from src.ml.data.labels import (
    ACTIVITY_CLASSES,
    FALL_ID,
    NUM_ACTIVITIES,
    SCENARIO_TO_ACTIVITY,
)
from src.ml.data.pipeline import STRIDE, WINDOW_SIZE
from src.ml.data.preprocessing import FEATURE_COLUMNS
from src.ml.data.windowing import sliding_windows
from src.ml.engines.trainer import predict_probabilities


def apply_fall_threshold(
    probabilities: np.ndarray,
    threshold: float,
) -> np.ndarray:
    is_fall = probabilities[:, FALL_ID] >= threshold
    other_classes = probabilities.copy()
    other_classes[:, FALL_ID] = -1.0
    predictions = other_classes.argmax(axis=1)
    predictions[is_fall] = FALL_ID

    return predictions


def evaluate_windows(
    probabilities: np.ndarray,
    labels: np.ndarray,
    threshold: float,
) -> dict:
    predictions = apply_fall_threshold(probabilities, threshold)
    class_ids = list(range(NUM_ACTIVITIES))

    return {
        "macro_f1": float(
            f1_score(
                labels,
                predictions,
                labels=class_ids,
                average="macro",
                zero_division=0,
            )
        ),
        "report": classification_report(
            labels,
            predictions,
            labels=class_ids,
            target_names=ACTIVITY_CLASSES,
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": confusion_matrix(
            labels,
            predictions,
            labels=class_ids,
        ).tolist(),
    }


def score_recordings(
    model: nn.Module,
    data: pd.DataFrame,
    scaler: StandardScaler,
    device: str = "cpu",
) -> pd.DataFrame:
    rows = []

    for (subject, scenario), group in data.groupby(
        ["subject", "scenario"],
        sort=False,
    ):
        windows, _ = sliding_windows(
            scaler.transform(group[FEATURE_COLUMNS]),
            window_size=WINDOW_SIZE,
            stride=STRIDE,
        )

        if len(windows) == 0:
            continue

        fall_scores = predict_probabilities(
            model,
            windows,
            device=device,
        )[:, FALL_ID]

        rows.append(
            {
                "subject": subject,
                "scenario": scenario,
                "is_fall": SCENARIO_TO_ACTIVITY[scenario] == "fall",
                "peak_fall_probability": float(fall_scores.max()),
            }
        )

    return pd.DataFrame(rows)


def summarize_recordings(
    scores: pd.DataFrame,
    threshold: float,
) -> dict:
    detected = scores["peak_fall_probability"] >= threshold
    falls = scores["is_fall"]

    true_positives = int((detected & falls).sum())
    false_positives = int((detected & ~falls).sum())
    fall_recordings = int(falls.sum())
    other_recordings = int((~falls).sum())

    return {
        "fall_recordings": fall_recordings,
        "other_recordings": other_recordings,
        "detected_falls": true_positives,
        "false_alarms": false_positives,
        "sensitivity": true_positives / fall_recordings
        if fall_recordings
        else None,
        "specificity": 1.0 - false_positives / other_recordings
        if other_recordings
        else None,
        "false_alarms_by_scenario": {
            str(scenario): int(count)
            for scenario, count in scores[detected & ~falls]
            .groupby("scenario")
            .size()
            .items()
        },
        "missed_falls": [
            f"{row.subject}/{row.scenario}"
            for row in scores[~detected & falls].itertuples()
        ],
    }
