import json
from pathlib import Path
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from colorlab.api import create_app
from colorlab.inference import predict
from colorlab.modeling import metrics, train_all
from colorlab.report import export_html


def test_all_rows_have_one_grouped_out_of_fold_prediction(synthetic_run):
    split = pd.read_csv(synthetic_run / "split_manifest.csv")
    predictions = pd.read_csv(synthetic_run / "oof_predictions.csv")
    assert not split.duplicated(["experiment", "sample_id"]).any()
    assert not predictions.isna().any().any()
    assert len(split) == len(predictions) == 120
    assert split.groupby(["experiment", "base_order"]).fold.nunique().max() == 1
    assert split.groupby(["experiment", "group"]).fold.nunique().max() == 1


def test_report_metrics_recompute_from_saved_predictions(synthetic_run):
    report = json.loads((synthetic_run / "report.json").read_text())
    for experiment in report["experiments"]:
        rows = experiment["samples"]
        for key, model in experiment["models"].items():
            expected = metrics([r["label"] for r in rows], [r["scores"][key] for r in rows])
            assert expected == model["metrics"]


def test_retraining_does_not_overwrite_run(synthetic_run):
    with pytest.raises(ValueError, match="already exists"):
        train_all("not-needed", synthetic_run)


def test_offline_export_contains_models_and_no_placeholder(synthetic_run, tmp_path):
    path = export_html(synthetic_run, tmp_path / "showcase.html")
    html = path.read_text()
    assert "__COLORLAB_DATA__" not in html
    assert "/* COLORLAB_" not in html
    assert '"trees"' in html and "ColorLabEngine" in html
    assert 'id="language-en"' in html and 'id="language-zh"' in html
    assert '"any"' in html
    assert '<script src="http' not in html


def test_api_and_python_prediction_agree(synthetic_run):
    client = TestClient(create_app(synthetic_run))
    body = {"experiment": "qd_dy", "records": [{"target": [50, 4, -3], "sample": [51, 5, -3]}]}
    response = client.post("/api/predict", json=body)
    assert response.status_code == 200
    assert response.json() == predict(synthetic_run, body["experiment"], body["records"])
    assert client.get("/health").json()["model_ready"]
    assert client.get("/api/summary").status_code == 200
    page = client.get("/")
    assert page.status_code == 200
    assert 'id="language-en"' in page.text
    assert not (synthetic_run / "showcase.html").exists()


@pytest.mark.parametrize("body", [
    {"experiment": "../bad", "records": []},
    {"experiment": "qd_dy", "records": [{"target": [50, 0], "sample": [50, 0, 0]}]},
    {"experiment": "qd_dy", "records": [{"target": [50, 0, 0], "sample": [120, 0, 0]}]},
    {"experiment": "water_dy", "records": [{"target": [50, 0, 0], "sample": [51, 0, 0]}]},
    {"experiment": "qd_dy", "records": [{"target": [50, 0, 0], "sample": [51, 0, 0], "reference": [55, 0, 0]}]},
    {"experiment": "qd_dy", "threshold": 1.1, "records": [{"target": [50, 0, 0], "sample": [51, 0, 0]}]},
])
def test_api_rejects_invalid_requests(synthetic_run, body):
    assert TestClient(create_app(synthetic_run)).post("/api/predict", json=body).status_code == 422


def test_untrained_api_has_explicit_unavailable_status(tmp_path):
    client = TestClient(create_app(tmp_path))
    assert client.get("/api/summary").status_code == 503
    assert client.get("/health").json()["model_ready"] is False
