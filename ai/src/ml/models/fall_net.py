import torch
from torch import nn


class SignedLog(nn.Module):

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.sign(x) * torch.log1p(torch.abs(x))


class ResidualBlock(nn.Module):
    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: int = 5,
        stride: int = 2,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        padding = kernel_size // 2

        self.layers = nn.Sequential(
            nn.Conv1d(
                in_channels,
                out_channels,
                kernel_size,
                stride=stride,
                padding=padding,
                bias=False,
            ),
            nn.BatchNorm1d(out_channels),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Conv1d(
                out_channels,
                out_channels,
                kernel_size,
                padding=padding,
                bias=False,
            ),
            nn.BatchNorm1d(out_channels),
        )

        self.shortcut = nn.Sequential(
            nn.Conv1d(
                in_channels,
                out_channels,
                kernel_size=1,
                stride=stride,
                bias=False,
            ),
            nn.BatchNorm1d(out_channels),
        )

        self.activation = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.activation(self.layers(x) + self.shortcut(x))


class FallNet(nn.Module):

    def __init__(
        self,
        in_features: int = 6,
        num_classes: int = 8,
        base_channels: int = 32,
        dropout: float = 0.3,
    ) -> None:
        super().__init__()

        self.compress = SignedLog()

        self.stem = nn.Sequential(
            nn.Conv1d(
                in_features,
                base_channels,
                kernel_size=7,
                padding=3,
                bias=False,
            ),
            nn.BatchNorm1d(base_channels),
            nn.ReLU(inplace=True),
        )

        self.blocks = nn.Sequential(
            ResidualBlock(base_channels, base_channels * 2),
            ResidualBlock(base_channels * 2, base_channels * 3),
            ResidualBlock(base_channels * 3, base_channels * 4),
        )

        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(base_channels * 8, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.ndim != 3:
            raise ValueError("Input must have shape (batch, time, features).")

        features = self.blocks(self.stem(self.compress(x).transpose(1, 2)))
        pooled = torch.cat(
            [features.mean(dim=2), features.amax(dim=2)],
            dim=1,
        )

        return self.classifier(pooled)
