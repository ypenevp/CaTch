import numpy as np
import torch
from torch.utils.data import Dataset


class FallDataset(Dataset):
    def __init__(
        self,
        X: np.ndarray,
        y: np.ndarray,
    ) -> None:
        X = np.asarray(X, dtype=np.float32)
        y = np.asarray(y, dtype=np.int64)

        if X.ndim != 3:
            raise ValueError(
                "X must have shape (windows, window_size, features)."
            )

        if y.ndim != 1 or len(X) != len(y):
            raise ValueError("X and y must contain the same number of windows.")

        if len(X) == 0:
            raise ValueError("Dataset is empty.")

        if not np.isfinite(X).all():
            raise ValueError("X contains invalid numerical values.")

        if not np.isin(y, [0, 1]).all():
            raise ValueError("Labels must contain only 0 and 1.")

        self.X = torch.from_numpy(X)
        self.y = torch.from_numpy(y)

    def __len__(self) -> int:
        return len(self.X)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.X[index], self.y[index]
