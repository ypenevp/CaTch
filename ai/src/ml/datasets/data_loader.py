from torch.utils.data import DataLoader

from src.ml.datasets.fall_dataset import FallDataset


def create_data_loader(
    X,
    y,
    batch_size: int = 32,
    shuffle: bool = False,
    num_workers: int = 0,
) -> DataLoader:
    if batch_size <= 0:
        raise ValueError("batch_size must be positive.")

    if num_workers < 0:
        raise ValueError("num_workers cannot be negative.")

    dataset = FallDataset(X, y)

    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        drop_last=False,
    )


def create_train_test_loaders(
    X_train,
    y_train,
    X_test,
    y_test,
    batch_size: int = 32,
    num_workers: int = 0,
) -> tuple[DataLoader, DataLoader]:
    train_loader = create_data_loader(
        X_train,
        y_train,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
    )

    test_loader = create_data_loader(
        X_test,
        y_test,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
    )

    return train_loader, test_loader
