from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
import uvicorn
from fastapi import FastAPI, Request
from pydantic import BaseModel, Field

from src.ml.data.pipeline import WINDOW_SIZE
from src.ml.data.prepare_dataset import ROOT_DIR
from src.ml.data.preprocessing import FEATURE_COLUMNS
from src.ml.engines.inference import FallDetector


CHECKPOINT_PATH = ROOT_DIR / "artifacts" / "fall_net.pt"
HOST = "127.0.0.1"
PORT = 7070

FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]


class Record(BaseModel):
    ax: FiniteFloat
    ay: FiniteFloat
    az: FiniteFloat
    droll: FiniteFloat
    dpitch: FiniteFloat
    dyaw: FiniteFloat


class AnalyzeRequest(BaseModel):
    records: list[Record] = Field(
        min_length=WINDOW_SIZE,
        max_length=WINDOW_SIZE,
    )
    bpm: Annotated[float, Field(gt=0, allow_inf_nan=False)] | None = None


class FallAssessment(BaseModel):
    cause: str
    reason: str
    bpm: float | None


class AnalyzeResponse(BaseModel):
    activity: str
    fall_detected: bool
    fall_probability: float
    fall_assessment: FallAssessment | None


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.detector = FallDetector(CHECKPOINT_PATH)
    yield


app = FastAPI(title="CaTch fall detection", lifespan=lifespan)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest, request: Request) -> dict:
    samples = np.array(
        [
            [getattr(record, column) for column in FEATURE_COLUMNS]
            for record in payload.records
        ],
        dtype=np.float32,
    )

    result = request.app.state.detector.analyze(samples, bpm=payload.bpm)

    return {
        "activity": result["timeline"][0]["activity"],
        "fall_detected": result["fall_detected"],
        "fall_probability": result["fall_probability"],
        "fall_assessment": result["fall_assessment"],
    }


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
