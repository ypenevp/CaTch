
from pathlib import Path
import unittest

import numpy as np

from src.ml.data.preprocessing import load_data, clean_data
from src.ml.data.pipeline import prepare_pipeline


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "data" / "raw" / "hifd_filtered.csv"


class TestDataPipeline(unittest.TestCase):
    def test_real_dataset_pipeline(self):
        data = clean_data(load_data(DATA_PATH))
        result = prepare_pipeline(data)

        X_train = result["X_train"]
        y_train = result["y_train"]
        X_test = result["X_test"]
        y_test = result["y_test"]

        self.assertEqual(X_train.ndim, 3)
        self.assertEqual(X_test.ndim, 3)

        self.assertEqual(X_train.shape[1:], (100, 6))
        self.assertEqual(X_test.shape[1:], (100, 6))

        self.assertEqual(len(X_train), len(y_train))
        self.assertEqual(len(X_test), len(y_test))

        self.assertTrue(np.isfinite(X_train).all())
        self.assertTrue(np.isfinite(X_test).all())

        self.assertTrue(np.isin(y_train, [0, 1]).all())
        self.assertTrue(np.isin(y_test, [0, 1]).all())

        self.assertGreater(len(X_train), 0)
        self.assertGreater(len(X_test), 0)

        self.assertFalse(
            set(result["train_subjects"])
            & set(result["test_subjects"])
        )

        self.assertEqual(
            result["feature_columns"],
            ["ax", "ay", "az", "droll", "dpitch", "dyaw"],
        )

        print("\nPipeline validation passed.")
        print("Train:", X_train.shape)
        print("Test:", X_test.shape)
        print("Train labels:", np.unique(y_train, return_counts=True))
        print("Test labels:", np.unique(y_test, return_counts=True))
        print("Train subjects:", len(result["train_subjects"]))
        print("Test subjects:", len(result["test_subjects"]))


if __name__ == "__main__":
    unittest.main()
