from collections.abc import Collection

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler

from src.ml.data.labels import FALL_ID, activity_id_for_scenario
from src.ml.data.preprocessing import (
    FEATURE_COLUMNS,
    LABEL_COLUMN,
)
from src.ml.data.windowing import create_activity_windows


WINDOW_SIZE = 75
STRIDE = 38
FALL_STRIDE = 5
TEST_SIZE = 0.2
RANDOM_STATE = 42


def create_grouped_windows(
    data: pd.DataFrame,
    scaler: StandardScaler,
    fall_stride: int | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    windows = []
    activities = []

    for (_, scenario), group in data.groupby(
        ["subject", "scenario"],
        sort=False,
    ):
        raw = group[FEATURE_COLUMNS].to_numpy(dtype=np.float32)
        X = scaler.transform(group[FEATURE_COLUMNS])

        group_windows, group_activities = create_activity_windows(
            X,
            raw,
            activity_id_for_scenario(scenario),
            window_size=WINDOW_SIZE,
            stride=STRIDE,
            fall_stride=fall_stride,
        )

        if len(group_windows) > 0:
            windows.append(group_windows)
            activities.append(group_activities)

    if not windows:
        raise ValueError("No windows were created.")

    X_windows = np.concatenate(windows)
    y_activity = np.concatenate(activities)
    y_fall = (y_activity == FALL_ID).astype(np.int64)

    return X_windows, y_fall, y_activity


def split_by_subject(
    data: pd.DataFrame,
    test_size: float,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=test_size,
        random_state=RANDOM_STATE,
    )

    first_indices, second_indices = next(
        splitter.split(
            data,
            data[LABEL_COLUMN],
            groups=data["subject"],
        )
    )

    return data.iloc[first_indices].copy(), data.iloc[second_indices].copy()


def sorted_subjects(data: pd.DataFrame) -> list[int]:
    return sorted(data["subject"].unique().tolist())


def prepare_pipeline(
    data: pd.DataFrame,
    test_subjects: Collection[int] | None = None,
    val_size: float = 0.0,
) -> dict:
    if data["subject"].nunique() < 2:
        raise ValueError("At least two subjects are required.")

    if test_subjects is None:
        train_data, test_data = split_by_subject(data, TEST_SIZE)
    else:
        is_test = data["subject"].isin(list(test_subjects))
        train_data = data[~is_test].copy()
        test_data = data[is_test].copy()

    val_data = None

    if val_size > 0:
        train_data, val_data = split_by_subject(train_data, val_size)

    train_subjects = sorted_subjects(train_data)
    test_subject_list = sorted_subjects(test_data)
    val_subjects = [] if val_data is None else sorted_subjects(val_data)

    if (
        set(train_subjects) & set(test_subject_list)
        or set(train_subjects) & set(val_subjects)
        or set(val_subjects) & set(test_subject_list)
    ):
        raise RuntimeError("Subject leakage detected.")

    scaler = StandardScaler()
    scaler.fit(train_data[FEATURE_COLUMNS])

    X_train, y_train, y_train_activity = create_grouped_windows(
        train_data,
        scaler,
        fall_stride=FALL_STRIDE,
    )

    X_test, y_test, y_test_activity = create_grouped_windows(
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

    result = {
        "X_train": X_train,
        "y_train": y_train,
        "y_train_activity": y_train_activity,
        "X_test": X_test,
        "y_test": y_test,
        "y_test_activity": y_test_activity,
        "scaler": scaler,
        "feature_columns": FEATURE_COLUMNS.copy(),
        "train_subjects": train_subjects,
        "test_subjects": test_subject_list,
        "val_subjects": val_subjects,
    }

    if val_data is not None:
        X_val, y_val, y_val_activity = create_grouped_windows(
            val_data,
            scaler,
        )
        result.update(
            X_val=X_val,
            y_val=y_val,
            y_val_activity=y_val_activity,
        )

    return result
