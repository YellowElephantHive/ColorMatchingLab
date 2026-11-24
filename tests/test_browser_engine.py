"""Parity tests use Node for pure arithmetic, not browser automation."""
import json
from pathlib import Path
import shutil
import subprocess
import joblib
import numpy as np
import pytest
from colorlab.features import make_features
from colorlab.modeling import metrics


@pytest.mark.skipif(shutil.which("node") is None, reason="Node is required for browser inference parity")
def test_offline_model_and_cmc_match_python(synthetic_run):
    check_run_parity(synthetic_run)


def check_run_parity(run):
    engine = Path(__file__).resolve().parents[1] / "src/colorlab/web/engine.js"
    report = json.loads((run / "report.json").read_text())
    script = """
const fs=require('fs'),E=require(process.argv[1]),r=JSON.parse(fs.readFileSync(0,'utf8'));
const result=r.experiments.map(e=>({id:e.id,features:e.samples.map(s=>E.features(s.target,s.sample,s.reference)),
 scores:Object.fromEntries(Object.entries(e.models).map(([k,m])=>[k,e.samples.map(s=>E.predict(m.portable,E.features(s.target,s.sample,s.reference)))])),
 metrics:Object.fromEntries(Object.keys(e.models).map(k=>[k,[.1,.5,.9].map(t=>E.metrics(e.samples,k,t))]))}));
process.stdout.write(JSON.stringify(result));
"""
    output = subprocess.run([shutil.which("node"), "-e", script, str(engine)], input=json.dumps(report), text=True, capture_output=True, check=True)
    result = json.loads(output.stdout)
    for experiment, js in zip(report["experiments"], result):
        rows = experiment["samples"]
        X = make_features([s["target"] for s in rows], [s["sample"] for s in rows], [s["reference"] for s in rows])
        np.testing.assert_allclose(js["features"], X, atol=1e-9, rtol=1e-10)
        bundle = joblib.load(run / f"{experiment['id']}.joblib")
        for key, model in bundle["models"].items():
            expected = model.predict_proba(X)[:, list(model.classes_).index(1)]
            np.testing.assert_allclose(js["scores"][key], expected, atol=1e-10)
            for threshold, browser in zip([.1, .5, .9], js["metrics"][key]):
                reference = metrics([s["label"] for s in rows], [s["scores"][key] for s in rows], threshold)
                for metric in ["f1_pass", "f1_macro", "recall_no_pass", "accuracy", "balanced_accuracy"]:
                    assert browser[metric] == pytest.approx(reference[metric])


@pytest.mark.skipif(shutil.which("node") is None, reason="Node is required for browser inference parity")
def test_delivered_models_match_browser():
    run = Path(__file__).resolve().parents[1] / "artifacts/run-01"
    if not (run / "report.json").exists():
        pytest.skip("Private dataset artifacts are not distributed in Git/CI")
    check_run_parity(run)
