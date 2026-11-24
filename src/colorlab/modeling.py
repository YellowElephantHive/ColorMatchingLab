"""Fixed candidate models; all reported predictions come from excluded groups."""
from datetime import datetime, timezone
from hashlib import sha256
from importlib.metadata import version
import json
from pathlib import Path
import platform
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from .data import EXPERIMENTS, load_experiment
from .features import FEATURES


class CMCThresholdClassifier(ClassifierMixin, BaseEstimator):
    """An explicit reference rule, not a company acceptance specification."""
    def fit(self, X, y):
        self.classes_ = np.array([0, 1])
        self.n_features_in_ = np.asarray(X).shape[1]
        return self

    def predict_proba(self, X):
        score = (np.asarray(X)[:, 0] <= 1).astype(float)
        return np.column_stack([1 - score, score])

    def predict(self, X):
        return self.predict_proba(X)[:, 1].astype(int)


def candidates(seed=42, trees=240):
    return {
        "rf": ("Random Forest", RandomForestClassifier(n_estimators=trees, criterion="entropy", min_samples_leaf=2, max_features="sqrt", class_weight="balanced", random_state=seed, n_jobs=2)),
        "logistic": ("Logistic Regression", make_pipeline(StandardScaler(), LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000, random_state=seed))),
        "majority": ("Majority baseline", DummyClassifier(strategy="most_frequent")),
        "cmc": ("CMC ≤ 1 rule", CMCThresholdClassifier()),
    }


def metrics(y, score, threshold=.5):
    pred = (np.asarray(score) >= threshold).astype(int)
    return {"accuracy": float(accuracy_score(y, pred)),
            "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
            "f1_pass": float(f1_score(y, pred, zero_division=0)),
            "f1_macro": float(f1_score(y, pred, average="macro", zero_division=0)),
            "precision_pass": float(precision_score(y, pred, zero_division=0)),
            "recall_pass": float(recall_score(y, pred, zero_division=0)),
            "recall_no_pass": float(recall_score(y, pred, pos_label=0, zero_division=0)),
            "roc_auc": float(roc_auc_score(y, score)) if len(set(y)) == 2 else None,
            "confusion_matrix": confusion_matrix(y, pred, labels=[0, 1]).tolist()}


def portable_model(model, key):
    """Serialize only inference arrays. No Python runtime is needed in the report."""
    if key == "rf":
        trees = []
        positive = int(np.flatnonzero(model.classes_ == 1)[0])
        for estimator in model.estimators_:
            tree = estimator.tree_
            values = tree.value[:, 0, :]
            probabilities = values[:, positive] / values.sum(axis=1)
            trees.append({"f": tree.feature.tolist(), "t": tree.threshold.tolist(),
                          "l": tree.children_left.tolist(), "r": tree.children_right.tolist(),
                          "p": probabilities.tolist()})
        return {"kind": key, "trees": trees}
    if key == "logistic":
        scaler, logistic = model.steps[0][1], model.steps[1][1]
        return {"kind": key, "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist(),
                "coef": logistic.coef_[0].tolist(), "intercept": float(logistic.intercept_[0])}
    if key == "majority":
        return {"kind": key, "score": float(model.predict_proba(np.zeros((1, 4)))[0, list(model.classes_).index(1)])}
    return {"kind": "cmc", "cutoff": 1.0}


def train_all(data_dir, output_dir, seed=42, folds=5, trees=240):
    output = Path(output_dir)
    if (output / "report.json").exists():
        raise ValueError(f"Run already exists: {output}. Choose a new output directory to preserve results.")
    output.mkdir(parents=True, exist_ok=True)
    start = time.perf_counter()
    generated = datetime.now(timezone.utc).isoformat()
    report = {"schema_version": 1, "generated_at": generated, "seed": seed, "folds": folds,
              "feature_names": list(FEATURES), "threshold": .5,
              "evaluation": "StratifiedGroupKFold; base work order and identical Lab inputs kept together; fixed model settings; no hyperparameter search",
              "label_definition": "PASS='*' → 1; NO_PASS/NO-PASS='*' → 0. NO-PASS includes upstream rejection, not exclusively final IN rejection.",
              "deployment_context": "The owner reports the complete model was deployed at the company. This artifact reconstructs the supplied experimental notebooks, not the deployed system.",
              "experiments": []}
    models, split_rows, prediction_rows = {}, [], []
    for spec in EXPERIMENTS:
        print(f"Training {spec.key}", flush=True)
        data = load_experiment(Path(data_dir), spec)
        X, y, groups = data["X"], data["y"], data["groups"]
        split = list(StratifiedGroupKFold(n_splits=folds, shuffle=True, random_state=seed).split(X, y, groups))
        fold_index = np.full(len(y), -1)
        fold_details = []
        for fold, (train, test) in enumerate(split):
            assert not set(groups[train]) & set(groups[test])
            assert not set(data["orders"][train]) & set(data["orders"][test])
            if len(set(y[train])) != 2 or len(set(y[test])) != 2:
                raise ValueError(f"{spec.key}: each train/test fold must contain both labels")
            fold_index[test] = fold
            fold_details.append({"fold": fold, "train_rows": len(train), "test_rows": len(test),
                                 "train_groups": len(set(groups[train])), "test_groups": len(set(groups[test])),
                                 "group_overlap": 0})
        assert (fold_index >= 0).all()
        entry = {"id": spec.key, "name": spec.name, "description": spec.description,
                 "sample_stage": "MN" if spec.sample_prefix == "MN" else "DY",
                 "de_reference": spec.reference_prefix, "audit": data["audit"],
                 "folds": fold_details, "models": {}, "samples": [],
                 "feature_bounds": {name: [float(X[:, j].min()), float(X[:, j].max())] for j, name in enumerate(FEATURES)}}
        models[spec.key] = {}
        scores = {}
        for key, (name, prototype) in candidates(seed, trees).items():
            score = np.full(len(y), np.nan)
            fold_metrics, importance = [], []
            fit_seconds = 0.0
            for train, test in split:
                model = clone(prototype)
                tick = time.perf_counter()
                model.fit(X[train], y[train])
                fit_seconds += time.perf_counter() - tick
                score[test] = model.predict_proba(X[test])[:, list(model.classes_).index(1)]
                fold_metrics.append(metrics(y[test], score[test]))
                if key == "rf":
                    imp = permutation_importance(model, X[test], y[test], scoring="f1", n_repeats=3, random_state=seed, n_jobs=1)
                    importance.append(imp.importances_mean)
            assert np.isfinite(score).all()
            full = clone(prototype).fit(X, y)
            models[spec.key][key] = full
            scores[key] = score
            item = {"name": name, "metrics": metrics(y, score), "fold_metrics": fold_metrics,
                    "fold_f1_std": float(np.std([v["f1_pass"] for v in fold_metrics], ddof=1)),
                    "cv_fit_seconds": fit_seconds, "portable": portable_model(full, key)}
            if importance:
                item["permutation_importance"] = dict(zip(FEATURES, np.mean(importance, axis=0).tolist()))
            entry["models"][key] = item
        for i, (_, row) in enumerate(data["df"].iterrows()):
            sample_id = f"{spec.key}-{i + 1:04}"
            entry["samples"].append({"id": sample_id, "fold": int(fold_index[i]), "label": int(y[i]),
                                     "target": data["target"][i].tolist(), "sample": data["sample"][i].tolist(),
                                     "reference": data["reference"][i].tolist(), "features": X[i].tolist(),
                                     "scores": {key: float(score[i]) for key, score in scores.items()}})
            split_rows.append({"experiment": spec.key, "sample_id": sample_id, "source_row": int(row.name + 2),
                               "work_order": row.ID, "base_order": data["orders"][i], "group": groups[i], "fold": int(fold_index[i])})
            prediction_rows.append({"experiment": spec.key, "sample_id": sample_id, "label": int(y[i]),
                                    "fold": int(fold_index[i]), **dict(zip(FEATURES, X[i])),
                                    **{f"{key}_oof_score": float(score[i]) for key, score in scores.items()}})
        joblib.dump({"spec": spec, "models": models[spec.key], "feature_names": FEATURES}, output / f"{spec.key}.joblib", compress=3)
        report["experiments"].append(entry)
    report["duration_seconds"] = time.perf_counter() - start
    report["environment"] = {"python": platform.python_version(), "platform": platform.platform(),
                             **{p: version(p) for p in ["numpy", "pandas", "scikit-learn", "scikit-image", "joblib"]}}
    report["source_hashes"] = {str(p.relative_to(Path(__file__).parent)): sha256(p.read_bytes()).hexdigest() for p in sorted(Path(__file__).parent.rglob("*.py"))}
    (output / "report.json").write_text(json.dumps(report, ensure_ascii=False, allow_nan=False, separators=(",", ":")))
    pd.DataFrame(split_rows).to_csv(output / "split_manifest.csv", index=False)
    pd.DataFrame(prediction_rows).to_csv(output / "oof_predictions.csv", index=False)
    summary = {**report, "experiments": [{**e, "samples": [], "models": {k: {a: b for a, b in v.items() if a != "portable"} for k, v in e["models"].items()}} for e in report["experiments"]]}
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2, allow_nan=False))
    checksums = {p.name: sha256(p.read_bytes()).hexdigest() for p in sorted(output.iterdir()) if p.is_file()}
    (output / "checksums.json").write_text(json.dumps(checksums, indent=2))
    return report
