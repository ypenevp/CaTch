import unittest
import numpy as np
import torch
from src.ml.datasets.data_loader import (
    create_data_loader,
    create_train_test_loaders,
)
from src.ml.data.windowing import create_windows
from src.ml.datasets.fall_dataset import FallDataset


class TestFallDataset(unittest.TestCase):
    def setUp(self):
        self.X = np.random.default_rng(42).normal(
            size=(100, 75, 6)
        ).astype(np.float32)

        self.y = np.zeros(100, dtype=np.int64)
        self.y[10] = 1
        self.y[50] = 1

    def test_dataset_length(self):
        dataset = FallDataset(self.X, self.y)

        self.assertEqual(len(dataset), 100)

    def test_sample_shapes_and_types(self):
        dataset = FallDataset(self.X, self.y)

        features, label = dataset[0]

        self.assertEqual(features.shape, (75, 6))
        self.assertEqual(features.dtype, torch.float32)
        self.assertEqual(label.dtype, torch.int64)

    def test_dataset_rejects_invalid_dimensions(self):
        with self.assertRaises(ValueError):
            FallDataset(
                np.zeros((10, 6), dtype=np.float32),
                np.zeros(10, dtype=np.int64),
            )

    def test_window_creation(self):
        X = np.arange(600, dtype=np.float32).reshape(100, 6)
        y = np.zeros(100, dtype=np.int64)
        y[10] = 1

        windows, labels = create_windows(
            X,
            y,
            window_size=20,
            stride=10,
        )

        self.assertEqual(windows.shape, (9, 20, 6))
        self.assertEqual(labels.shape, (9,))
        self.assertEqual(labels[0], 1)
        self.assertEqual(labels[1], 1)
        self.assertEqual(labels[2], 0)

    def test_data_loader_batches(self):
        loader = create_data_loader(
            self.X,
            self.y,
            batch_size=32,
        )

        features, labels = next(iter(loader))

        self.assertEqual(features.shape, (32, 75, 6))
        self.assertEqual(labels.shape, (32,))

    def test_train_and_test_loaders(self):
        train_loader, test_loader = create_train_test_loaders(
            self.X[:80],
            self.y[:80],
            self.X[80:],
            self.y[80:],
            batch_size=16,
        )

        self.assertEqual(len(train_loader.dataset), 80)
        self.assertEqual(len(test_loader.dataset), 20)

    def test_invalid_batch_size(self):
        with self.assertRaises(ValueError):
            create_data_loader(
                self.X,
                self.y,
                batch_size=0,
            )


if __name__ == "__main__":
    unittest.main()
