import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler

from src.ml.data.preprocessing import (
    FEATURE_COLUMNS,
    LABEL_COLUMN,
)
from src.ml.data.windowing import create_windows


WINDOW_SIZE = 100
STRIDE = 50
TEST_SIZE = 0.2
RANDOM_STATE = 42


def create_grouped_windows(
    data: pd.DataFrame,
    scaler: StandardScaler,
) -> tuple[np.ndarray, np.ndarray]:
    windows = []
    labels = []

    for _, group in data.groupby(
        ["subject", "scenario"],
        sort=False,
    ):
        X = scaler.transform(group[FEATURE_COLUMNS])
        y = group[LABEL_COLUMN].to_numpy(dtype=np.int64)

        group_windows, group_labels = create_windows(
            X,
            y,
            window_size=WINDOW_SIZE,
            stride=STRIDE,
        )

        if len(group_windows) > 0:
            windows.append(group_windows)
            labels.append(group_labels)

    if not windows:
        raise ValueError("No windows were created.")

    return np.concatenate(windows), np.concatenate(labels)


def prepare_pipeline(
    data: pd.DataFrame,
) -> dict:
    if data["subject"].nunique() < 2:
        raise ValueError("At least two subjects are required.")

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )

    train_indices, test_indices = next(
        splitter.split(
            data,
            data[LABEL_COLUMN],
            groups=data["subject"],
        )
    )

    train_data = data.iloc[train_indices].copy()
    test_data = data.iloc[test_indices].copy()

    train_subjects = sorted(train_data["subject"].unique().tolist())
    test_subjects = sorted(test_data["subject"].unique().tolist())

    if set(train_subjects) & set(test_subjects):
        raise RuntimeError("Subject leakage detected.")

    scaler = StandardScaler()
    scaler.fit(train_data[FEATURE_COLUMNS])

    X_train, y_train = create_grouped_windows(
        train_data,
        scaler,
    )

    X_test, y_test = create_grouped_windows(
        test_data,
        scaler,
    )

    if len(np.unique(y_train)) < 2:
        raise ValueError(
            "Training windows contain only one class."
        )

    if not np.isfinite(X_train).all():
        raise ValueError("Training windows contain invalid values.")

    if not np.isfinite(X_test).all():
        raise ValueError("Test windows contain invalid values.")

    return {
        "X_train": X_train,
        "y_train": y_train,
        "X_test": X_test,
        "y_test": y_test,
        "scaler": scaler,
        "feature_columns": FEATURE_COLUMNS.copy(),
        "train_subjects": train_subjects,
        "test_subjects": test_subjects,
    }
