"""Optional local API; the exported showcase works without this server."""
import json
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, Field
from .inference import predict
from .report import render_html


class Sample(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    target: tuple[float, float, float]
    sample: tuple[float, float, float]
    reference: tuple[float, float, float] | None = None


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    experiment: Literal["qd_dy", "water_dy", "water_mn"]
    model: Literal["rf", "logistic", "majority", "cmc"] = "rf"
    threshold: float = Field(default=.5, ge=0, le=1)
    records: list[Sample] = Field(min_length=1, max_length=1000)


def create_app(run_dir="artifacts/run-01"):
    run_dir = Path(run_dir)
    app = FastAPI(title="Color Matching Lab", version="0.1.0", description="Experimental reconstruction of textile process PASS prediction.")

    @app.get("/health")
    def health():
        return {"status": "ok", "model_ready": (run_dir / "report.json").exists()}

    @app.get("/api/summary")
    def summary():
        if not (run_dir / "summary.json").exists():
            raise HTTPException(503, "No experiment run available. Run colorlab train first.")
        return json.loads((run_dir / "summary.json").read_text())

    @app.post("/api/predict")
    def prediction(request: PredictionRequest):
        try:
            return predict(run_dir, request.experiment, [x.model_dump() for x in request.records], request.model, request.threshold)
        except (ValueError, KeyError) as error:
            raise HTTPException(422, str(error)) from error
        except FileNotFoundError as error:
            raise HTTPException(503, "No model available. Run colorlab train first.") from error

    @app.get("/", response_class=HTMLResponse)
    def showcase():
        if not (run_dir / "report.json").exists():
            raise HTTPException(503, "No experiment run available. Run colorlab train first.")
        return render_html(run_dir)

    return app
