from pathlib import Path
import joblib
from .data import EXPERIMENTS
from .features import FEATURES, make_features

EXPERIMENT_KEYS = {spec.key for spec in EXPERIMENTS}
MODEL_KEYS = {"rf", "logistic", "majority", "cmc"}


def predict(run_dir, experiment, records, model="rf", threshold=.5):
    if experiment not in EXPERIMENT_KEYS or model not in MODEL_KEYS:
        raise ValueError("Unknown experiment or model")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")
    if not records or len(records) > 1000:
        raise ValueError("Supply 1 to 1000 records")
    spec = next(s for s in EXPERIMENTS if s.key == experiment)
    target, sample, reference = [], [], []
    for item in records:
        target.append(item["target"])
        sample.append(item["sample"])
        if spec.reference_prefix == "Std_IN":
            if item.get("reference") is not None and list(item["reference"]) != list(item["target"]):
                raise ValueError("QD DE reference must equal the IN target")
            reference.append(item["target"])
        elif item.get("reference") is None:
            raise ValueError("Water experiments require the DY standard as reference")
        else:
            reference.append(item["reference"])
    X = make_features(target, sample, reference)
    # Only locally created artifacts are loaded. No artifact-upload endpoint exists.
    bundle = joblib.load(Path(run_dir) / f"{experiment}.joblib")
    estimator = bundle["models"][model]
    scores = estimator.predict_proba(X)[:, list(estimator.classes_).index(1)]
    return {"experiment": experiment, "model": model, "threshold": threshold,
            "scope": "full-data fitted experimental model; scores are not calibrated probabilities",
            "predictions": [{"pass_score": float(s), "predicted_label": int(s >= threshold),
                             "decision": "PASS" if s >= threshold else "NO-PASS",
                             "features": dict(zip(FEATURES, x.tolist()))} for s, x in zip(scores, X)]}
