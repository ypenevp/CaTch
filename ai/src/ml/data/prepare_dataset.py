import json
from pathlib import Path
import numpy as np
import joblib

from src.ml.data.pipeline import prepare_pipeline
from src.ml.data.preprocessing import load_data, clean_data


ROOT_DIR = Path(__file__).resolve().parents[3]

RAW_PATH = ROOT_DIR / "data" / "raw" / "hifd_filtered.csv"
PROCESSED_DIR = ROOT_DIR / "data" / "processed"


def main() -> None:
    data = clean_data(load_data(RAW_PATH))
    result = prepare_pipeline(data)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    np.savez_compressed(
        PROCESSED_DIR / "train.npz",
        X=result["X_train"],
        y=result["y_train"],
    )

    np.savez_compressed(
        PROCESSED_DIR / "test.npz",
        X=result["X_test"],
        y=result["y_test"],
    )

    joblib.dump(
        result["scaler"],
        PROCESSED_DIR / "scaler.joblib",
    )

    metadata = {
        "feature_columns": result["feature_columns"],
        "window_size": 100,
        "stride": 50,
        "sampling_rate_hz": 50,
        "train_subjects": result["train_subjects"],
        "test_subjects": result["test_subjects"],
        "train_windows": len(result["X_train"]),
        "test_windows": len(result["X_test"]),
        "train_label_counts": {
            str(k): int(v)
            for k, v in zip(
                *np.unique(result["y_train"], return_counts=True)
            )
        },
        "test_label_counts": {
            str(k): int(v)
            for k, v in zip(
                *np.unique(result["y_test"], return_counts=True)
            )
        },
    }

    with (PROCESSED_DIR / "metadata.json").open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(metadata, file, indent=4, ensure_ascii=False)

    print("Data preparation completed.")
    print("Train:", result["X_train"].shape)
    print("Test:", result["X_test"].shape)
    print("Train labels:", np.unique(
        result["y_train"],
        return_counts=True,
    ))
    print("Test labels:", np.unique(
        result["y_test"],
        return_counts=True,
    ))
    print("Saved to:", PROCESSED_DIR)


if __name__ == "__main__":
    main()
