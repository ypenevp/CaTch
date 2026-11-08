import argparse
import json

from src.ml.data.prepare_dataset import RAW_PATH, ROOT_DIR
from src.ml.data.preprocessing import FEATURE_COLUMNS, clean_data, load_data
from src.ml.engines.inference import FallDetector


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--subject", type=int, required=True)
    parser.add_argument("--scenario", required=True)
    parser.add_argument(
        "--checkpoint",
        default=str(ROOT_DIR / "artifacts" / "fall_net.pt"),
    )
    args = parser.parse_args()

    data = clean_data(load_data(RAW_PATH))
    recording = data[
        (data["subject"] == args.subject)
        & (data["scenario"] == args.scenario)
    ]

    if recording.empty:
        raise SystemExit("No such recording.")

    result = FallDetector(args.checkpoint).analyze(
        recording[FEATURE_COLUMNS].to_numpy(),
        pulse=recording["heart"].to_numpy(),
    )

    print(json.dumps({k: v for k, v in result.items() if k != "timeline"}, indent=2))

    for entry in result["timeline"]:
        print(
            f"{entry['start_seconds']:6.1f}s  "
            f"{entry['activity']:<22} "
            f"P(fall)={entry['fall_probability']:.3f}"
        )


if __name__ == "__main__":
    main()
