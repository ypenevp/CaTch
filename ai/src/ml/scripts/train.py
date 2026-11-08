import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from src.ml.data.pipeline import WINDOW_SIZE, prepare_pipeline
from src.ml.data.prepare_dataset import RAW_PATH, ROOT_DIR, SAMPLING_RATE_HZ
from src.ml.data.preprocessing import FEATURE_COLUMNS, clean_data, load_data
from src.ml.engines.evaluator import (
    evaluate_windows,
    score_recordings,
    summarize_recordings,
)
from src.ml.engines.inference import save_checkpoint
from src.ml.engines.trainer import (
    TrainConfig,
    predict_probabilities,
    train_model,
)
from src.ml.utils.heart import assess_fall_cause, estimate_bpm


ARTIFACT_DIR = ROOT_DIR / "artifacts"
VAL_SIZE = 0.2
CV_FOLDS = 5
PRE_FALL_MARGIN = 60


def run_split(
    data: pd.DataFrame,
    config: TrainConfig,
    test_subjects: list[int] | None = None,
    log: bool = True,
):
    result = prepare_pipeline(
        data,
        test_subjects=test_subjects,
        val_size=VAL_SIZE,
    )
    model, training = train_model(result, config, log=log)
    threshold = training["fall_threshold"]

    windows = evaluate_windows(
        predict_probabilities(model, result["X_test"]),
        result["y_test_activity"],
        threshold,
    )
    test_data = data[data["subject"].isin(result["test_subjects"])]
    scores = score_recordings(model, test_data, result["scaler"])

    return model, result, training, windows, scores


def screen_heart_rate(data: pd.DataFrame) -> dict:
    falls = data[data["scenario"].str.startswith("fall")]
    bpms = []
    causes = []

    for _, group in falls.groupby(["subject", "scenario"], sort=False):
        accel = np.linalg.norm(group[["ax", "ay", "az"]].to_numpy(), axis=1)
        pre_fall_end = max(0, int(accel.argmax()) - PRE_FALL_MARGIN)
        bpm = estimate_bpm(group["heart"].to_numpy()[:pre_fall_end])
        causes.append(assess_fall_cause(bpm).cause)

        if bpm is not None:
            bpms.append(bpm)

    counts = pd.Series(causes).value_counts().to_dict()

    return {
        "fall_recordings": len(causes),
        "cause_counts": {str(k): int(v) for k, v in counts.items()},
        "bpm_min": float(np.min(bpms)),
        "bpm_median": float(np.median(bpms)),
        "bpm_max": float(np.max(bpms)),
    }


def cross_validate(data: pd.DataFrame, config: TrainConfig) -> dict:
    subjects = np.array(sorted(data["subject"].unique().tolist()))
    folds = GroupKFold(n_splits=CV_FOLDS)
    all_scores = []
    fold_results = []

    for fold, (_, test_indices) in enumerate(
        folds.split(subjects, groups=subjects),
        start=1,
    ):
        test_subjects = subjects[test_indices].tolist()
        _, _, training, windows, scores = run_split(
            data,
            config,
            test_subjects=test_subjects,
            log=False,
        )
        threshold = training["fall_threshold"]
        summary = summarize_recordings(scores, threshold)
        scores = scores.assign(detected=scores["peak_fall_probability"] >= threshold)
        all_scores.append(scores)
        fold_results.append(
            {
                "test_subjects": test_subjects,
                "threshold": threshold,
                "window_macro_f1": windows["macro_f1"],
                "recordings": summary,
            }
        )
        print(
            f"fold {fold}: macro_f1 {windows['macro_f1']:.3f} "
            f"sensitivity {summary['sensitivity']:.3f} "
            f"specificity {summary['specificity']:.3f}",
            flush=True,
        )

    combined = pd.concat(all_scores)
    falls = combined["is_fall"]

    return {
        "folds": fold_results,
        "pooled_sensitivity": float(combined.loc[falls, "detected"].mean()),
        "pooled_specificity": float(1.0 - combined.loc[~falls, "detected"].mean()),
        "mean_window_macro_f1": float(
            np.mean([fold["window_macro_f1"] for fold in fold_results])
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cv", action="store_true")
    parser.add_argument("--epochs", type=int, default=TrainConfig.epochs)
    args = parser.parse_args()

    config = TrainConfig(epochs=args.epochs)
    data = clean_data(load_data(RAW_PATH))

    model, result, training, windows, scores = run_split(data, config)
    threshold = training["fall_threshold"]
    recordings = summarize_recordings(scores, threshold)

    metrics = {
        "train_subjects": result["train_subjects"],
        "val_subjects": result["val_subjects"],
        "test_subjects": result["test_subjects"],
        "fall_threshold": threshold,
        "best_epoch": training["best_epoch"],
        "best_val_macro_f1": training["best_val_macro_f1"],
        "test_windows": windows,
        "test_recordings": recordings,
        "heart_rate_screen": screen_heart_rate(data),
    }

    print(json.dumps(
        {
            "fall_threshold": threshold,
            "test_macro_f1": windows["macro_f1"],
            "test_recordings": recordings,
            "heart_rate_screen": metrics["heart_rate_screen"],
        },
        indent=2,
    ), flush=True)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    save_checkpoint(
        ARTIFACT_DIR / "fall_net.pt",
        model,
        result["scaler"],
        FEATURE_COLUMNS,
        WINDOW_SIZE,
        SAMPLING_RATE_HZ,
        threshold,
    )

    if args.cv:
        metrics["cross_validation"] = cross_validate(data, config)
        print(
            "CV pooled sensitivity",
            metrics["cross_validation"]["pooled_sensitivity"],
            "specificity",
            metrics["cross_validation"]["pooled_specificity"],
            "mean macro F1",
            metrics["cross_validation"]["mean_window_macro_f1"],
        )

    with Path(ARTIFACT_DIR / "metrics.json").open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)


if __name__ == "__main__":
    main()
