import numpy as np

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
