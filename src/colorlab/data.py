"""Read legacy inputs without changing them; retain row-level audit information."""
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import numpy as np
import pandas as pd
from .features import FEATURES, make_features


@dataclass(frozen=True)
class Experiment:
    key: str
    name: str
    filename: str
    sample_prefix: str
    reference_prefix: str
    description: str


EXPERIMENTS = (
    Experiment("qd_dy", "QD · 染後", "match_color_QD.csv", "Comp", "Std_IN", "一般 QD 製程，以染後量測預測流程 PASS。"),
    Experiment("water_dy", "撥水 · 染後", "MCwater(T).csv", "Comp", "Std_DY", "撥水製程，以染後量測預測流程 PASS；不使用補值的 MN 欄位。"),
    Experiment("water_mn", "撥水 · 中檢實測", "MCwater(T)TRUE.csv", "MN", "Std_DY", "僅使用 TRUE 檔的實測 MN 量測，預測原始流程 PASS 標記。"),
)


def lab_columns(prefix):
    return [f"{prefix}_{channel}" for channel in ("L", "a", "b")]


def parse_labels(df):
    negative = "NO_PASS" if "NO_PASS" in df.columns else "NO-PASS"
    if "PASS" not in df or negative not in df:
        raise ValueError("Input must contain PASS and NO_PASS or NO-PASS flags")
    def flags(column):
        values = column.fillna("").astype(str).str.strip()
        invalid = ~values.isin(["", "*", "0", "0.0"])
        if invalid.any():
            raise ValueError(f"Unexpected label values: {sorted(values[invalid].unique())}")
        return values.eq("*")
    yes, no = flags(df.PASS), flags(df[negative])
    return yes.astype(int), yes ^ no, {"missing_label_rows": int((~yes & ~no).sum()), "conflicting_label_rows": int((yes & no).sum())}


def isolated_groups(df, target, sample, reference):
    """Union base work orders and identical measured inputs across work orders.

    Order suffixes (-A/-B) never cross folds. Identical measurements are kept
    for traceability but assigned to the same fold, including conflicting labels.
    """
    base = df.ID.astype(str).str.split("-").str[0].to_numpy()
    parent = {value: value for value in base}
    def find(value):
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value
    seen = {}
    arrays = np.column_stack([target, sample, reference])
    for order, row in zip(base, arrays):
        key = tuple(row.tolist())
        if key in seen:
            parent[find(order)] = find(seen[key])
        else:
            seen[key] = order
    return np.array([find(order) for order in base]), base


def load_experiment(root: Path, spec: Experiment):
    path = Path(root) / spec.filename
    df = pd.read_csv(path, dtype={"ID": str})
    raw_count = len(df)
    required = {"ID", *lab_columns("Std_IN"), *lab_columns(spec.sample_prefix), *lab_columns(spec.reference_prefix)}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns in {path.name}: {sorted(missing)}")
    if df.ID.isna().any() or df.ID.str.strip().eq("").any():
        raise ValueError("Each sample must have a work order ID for grouped evaluation")
    duplicate = df.duplicated()
    duplicates = int(duplicate.sum())
    df = df.loc[~duplicate].copy()
    y, valid, label_audit = parse_labels(df)
    excluded = [{"source_row": int(i + 2), "reason": "duplicate_record"} for i in np.flatnonzero(duplicate)]
    excluded += [{"source_row": int(i + 2), "reason": "missing_or_conflicting_label"} for i in df.index[~valid]]
    df, y = df.loc[valid].copy(), y.loc[valid].to_numpy()
    target = df[lab_columns("Std_IN")].to_numpy(float)
    sample = df[lab_columns(spec.sample_prefix)].to_numpy(float)
    reference = df[lab_columns(spec.reference_prefix)].to_numpy(float)
    x = make_features(target, sample, reference)
    groups, orders = isolated_groups(df, target, sample, reference)
    stored = df["MN_DE" if spec.sample_prefix == "MN" else "DE"].to_numpy(float)
    audit = {
        "filename": path.name, "sha256": sha256(path.read_bytes()).hexdigest(),
        "raw_rows": raw_count, "duplicate_rows_removed": duplicates, **label_audit,
        "usable_rows": len(df), "pass_rows": int(y.sum()), "no_pass_rows": int((y == 0).sum()),
        "base_work_orders": len(set(orders)), "isolated_groups": len(set(groups)),
        "stored_de_mismatch_gt_0_3": int((np.abs(stored - x[:, 0]) > .3).sum()),
        "excluded": excluded,
    }
    return {"spec": spec, "df": df, "X": x, "y": y, "groups": groups, "orders": orders,
            "target": target, "sample": sample, "reference": reference, "audit": audit}
