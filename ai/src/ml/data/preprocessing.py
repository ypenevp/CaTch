from pathlib import Path
import numpy as np
import pandas as pd


LABEL_COLUMN = "is_fall"

FEATURE_COLUMNS = [
    "ax",
    "ay",
    "az",
    "droll",
    "dpitch",
    "dyaw",
]

METADATA_COLUMNS = {
    "subject",
    "scenario",
    "class_id",
    LABEL_COLUMN,
}


def load_data(path: str | Path) -> pd.DataFrame:
    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    data = pd.read_csv(path)

    if data.empty:
        raise ValueError("Dataset is empty.")

    return data


def clean_data(data: pd.DataFrame) -> pd.DataFrame:
    data = data.copy()

    required_columns = {
        "subject",
        "scenario",
        LABEL_COLUMN,
        *FEATURE_COLUMNS,
    }

    missing_columns = required_columns - set(data.columns)

    if missing_columns:
        raise ValueError(
            f"Dataset is missing required columns: {sorted(missing_columns)}"
        )

    data = data.replace([np.inf, -np.inf], np.nan)

    data = data.dropna(
        subset=[
            "subject",
            "scenario",
            LABEL_COLUMN,
            *FEATURE_COLUMNS,
        ]
    )

    for column in FEATURE_COLUMNS:
        data[column] = pd.to_numeric(
            data[column],
            errors="raise",
        )

    data[LABEL_COLUMN] = pd.to_numeric(
        data[LABEL_COLUMN],
        errors="raise",
    )

    if not data[LABEL_COLUMN].isin([0, 1]).all():
        raise ValueError("is_fall must contain only 0 and 1.")

    if not np.equal(
        data[LABEL_COLUMN],
        data[LABEL_COLUMN].astype(int),
    ).all():
        raise ValueError("is_fall must contain integer labels.")

    data[LABEL_COLUMN] = data[LABEL_COLUMN].astype(np.int64)

    if not np.isfinite(data[FEATURE_COLUMNS].to_numpy()).all():
        raise ValueError("Features contain invalid numerical values.")

    return data.reset_index(drop=True)
