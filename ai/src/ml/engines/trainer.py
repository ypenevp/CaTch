from copy import deepcopy
from dataclasses import dataclass

import numpy as np
import torch
from sklearn.metrics import f1_score
from torch import nn

from src.ml.data.labels import FALL_ID, NUM_ACTIVITIES
from src.ml.datasets.data_loader import create_train_test_loaders
from src.ml.models.fall_net import FallNet


TARGET_FALL_RECALL = 0.95


@dataclass
class TrainConfig:
    epochs: int = 25
    patience: int = 8
    batch_size: int = 64
    learning_rate: float = 1e-3
    weight_decay: float = 1e-3
    label_smoothing: float = 0.05
    noise_std: float = 0.02
    scale_jitter: float = 0.1
    seed: int = 42


def class_weights(labels: np.ndarray, num_classes: int) -> torch.Tensor:
    counts = np.bincount(labels, minlength=num_classes).astype(np.float32)

    if (counts == 0).any():
        raise ValueError("Every class needs at least one training window.")

    weights = np.sqrt(counts.sum() / counts)

    return torch.from_numpy(weights / weights.mean())


def augment(
    batch: torch.Tensor,
    config: TrainConfig,
) -> torch.Tensor:
    scale = 1.0 + config.scale_jitter * (
        2.0 * torch.rand(batch.size(0), 1, 1, device=batch.device) - 1.0
    )

    return batch * scale + config.noise_std * torch.randn_like(batch)


@torch.no_grad()
def predict_probabilities(
    model: nn.Module,
    X: np.ndarray,
    batch_size: int = 256,
    device: str = "cpu",
) -> np.ndarray:
    model.eval()
    outputs = []

    for start in range(0, len(X), batch_size):
        batch = torch.as_tensor(
            X[start:start + batch_size],
            dtype=torch.float32,
            device=device,
        )
        outputs.append(torch.softmax(model(batch), dim=1).cpu().numpy())

    return np.concatenate(outputs)


def select_fall_threshold(
    probabilities: np.ndarray,
    labels: np.ndarray,
    target_recall: float = TARGET_FALL_RECALL,
) -> float:
    fall_scores = probabilities[labels == FALL_ID, FALL_ID]

    if len(fall_scores) == 0:
        raise ValueError("Validation data contains no fall windows.")

    threshold = float(np.quantile(fall_scores, 1.0 - target_recall))

    return float(np.clip(threshold, 0.05, 0.9))


def train_model(
    result: dict,
    config: TrainConfig | None = None,
    device: str = "cpu",
    log: bool = True,
) -> tuple[FallNet, dict]:
    config = config or TrainConfig()
    torch.manual_seed(config.seed)

    train_loader, val_loader = create_train_test_loaders(
        result["X_train"],
        result["y_train_activity"],
        result["X_val"],
        result["y_val_activity"],
        batch_size=config.batch_size,
        num_classes=NUM_ACTIVITIES,
    )

    model = FallNet(
        in_features=result["X_train"].shape[2],
        num_classes=NUM_ACTIVITIES,
    ).to(device)

    criterion = nn.CrossEntropyLoss(
        weight=class_weights(
            result["y_train_activity"],
            NUM_ACTIVITIES,
        ).to(device),
        label_smoothing=config.label_smoothing,
    )
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.learning_rate,
        weight_decay=config.weight_decay,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=config.epochs,
    )

    best_score = -1.0
    best_state = deepcopy(model.state_dict())
    best_epoch = 0
    history = []

    for epoch in range(1, config.epochs + 1):
        model.train()
        total_loss = 0.0

        for features, labels in train_loader:
            features = augment(features.to(device), config)
            labels = labels.to(device)

            optimizer.zero_grad()
            loss = criterion(model(features), labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(labels)

        scheduler.step()

        val_labels = val_loader.dataset.y.numpy()
        val_predictions = predict_probabilities(
            model,
            result["X_val"],
            device=device,
        ).argmax(axis=1)
        val_macro_f1 = float(
            f1_score(
                val_labels,
                val_predictions,
                labels=list(range(NUM_ACTIVITIES)),
                average="macro",
                zero_division=0,
            )
        )
        train_loss = total_loss / len(train_loader.dataset)

        history.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "val_macro_f1": val_macro_f1,
            }
        )

        if log:
            print(
                f"epoch {epoch:02d} "
                f"loss {train_loss:.4f} "
                f"val_macro_f1 {val_macro_f1:.4f}",
                flush=True,
            )

        if val_macro_f1 > best_score:
            best_score = val_macro_f1
            best_state = deepcopy(model.state_dict())
            best_epoch = epoch
        elif epoch - best_epoch >= config.patience:
            break

    model.load_state_dict(best_state)

    threshold = select_fall_threshold(
        predict_probabilities(model, result["X_val"], device=device),
        result["y_val_activity"],
    )

    return model, {
        "history": history,
        "best_epoch": best_epoch,
        "best_val_macro_f1": best_score,
        "fall_threshold": threshold,
    }
