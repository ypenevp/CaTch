import numpy as np

from src.ml.data.labels import FALL_ID, STILL_ID


IMPACT_MIN_POSITION = 18
IMPACT_MAX_POSITION = 56

FALL_EVENT_BEFORE = 60
FALL_EVENT_AFTER = 60

STILL_MAX_ACCEL_G = 0.3
STILL_MAX_GYRO_DPS = 30.0


def sliding_windows(
    X: np.ndarray,
    window_size: int = 75,
    stride: int = 38,
) -> tuple[np.ndarray, np.ndarray]:
    X = np.asarray(X, dtype=np.float32)

    if X.ndim != 2:
        raise ValueError("X must have shape (samples, features).")

    if len(X) < window_size:
        return (
            np.empty((0, window_size, X.shape[1]), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
        )

    starts = np.arange(0, len(X) - window_size + 1, stride, dtype=np.int64)

    return np.stack([X[start:start + window_size] for start in starts]), starts


def create_activity_windows(
    X: np.ndarray,
    raw: np.ndarray,
    activity_id: int,
    window_size: int = 75,
    stride: int = 38,
    fall_stride: int | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    X = np.asarray(X, dtype=np.float32)
    raw = np.asarray(raw, dtype=np.float32)

    if X.ndim != 2 or raw.shape != X.shape or raw.shape[1] != 6:
        raise ValueError("X and raw must have shape (samples, 6).")

    if len(X) < window_size:
        return (
            np.empty((0, window_size, X.shape[1]), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
        )

    accel = np.linalg.norm(raw[:, :3], axis=1)
    gyro = np.linalg.norm(raw[:, 3:], axis=1)
    last_start = len(X) - window_size
    is_fall = activity_id == FALL_ID
    impact = int(accel.argmax())

    starts = set(range(0, last_start + 1, stride))

    if is_fall and fall_stride is not None:
        starts.update(
            start
            for start in range(
                impact - IMPACT_MAX_POSITION + 1,
                impact - IMPACT_MIN_POSITION + 1,
                fall_stride,
            )
            if 0 <= start <= last_start
        )

    windows = []
    labels = []

    for start in sorted(starts):
        end = start + window_size
        still = (
            accel[start:end].max() < STILL_MAX_ACCEL_G
            and gyro[start:end].max() < STILL_MAX_GYRO_DPS
        )

        if is_fall:
            position = impact - start
            overlaps_fall = (
                start < impact + FALL_EVENT_AFTER
                and end > impact - FALL_EVENT_BEFORE
            )

            if IMPACT_MIN_POSITION <= position < IMPACT_MAX_POSITION:
                label = FALL_ID
            elif still and not overlaps_fall:
                label = STILL_ID
            else:
                continue
        else:
            label = STILL_ID if still else activity_id

        windows.append(X[start:end])
        labels.append(label)

    if not windows:
        return (
            np.empty((0, window_size, X.shape[1]), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
        )

    return np.stack(windows), np.asarray(labels, dtype=np.int64)


def create_windows(
    X: np.ndarray,
    y: np.ndarray,
    window_size: int = 100,
    stride: int = 50,
) -> tuple[np.ndarray, np.ndarray]:
    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y, dtype=np.int64)

    if X.ndim != 2:
        raise ValueError("X must have shape (samples, features).")

    if y.ndim != 1 or len(X) != len(y):
        raise ValueError("X and y must contain the same number of samples.")

    if window_size <= 0 or stride <= 0:
        raise ValueError("window_size and stride must be positive.")

    if not np.isfinite(X).all():
        raise ValueError("X contains invalid numerical values.")

    if not np.isin(y, [0, 1]).all():
        raise ValueError("Labels must contain only 0 and 1.")

    if len(X) < window_size:
        return (
            np.empty((0, window_size, X.shape[1]), dtype=np.float32),
            np.empty((0,), dtype=np.int64),
        )

    windows = []
    labels = []

    for start in range(0, len(X) - window_size + 1, stride):
        end = start + window_size

        windows.append(X[start:end])
        labels.append(int(np.any(y[start:end] == 1)))

    return (
        np.stack(windows).astype(np.float32),
        np.asarray(labels, dtype=np.int64),
    )
