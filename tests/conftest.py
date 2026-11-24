from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from colorlab.modeling import train_all


@pytest.fixture(scope="session")
def synthetic_run(tmp_path_factory):
    root = tmp_path_factory.mktemp("colorlab")
    source = root / "data"
    source.mkdir()
    rng = np.random.default_rng(7)
    rows = []
    for group in range(20):
        for label in [0, 1]:
            sample = np.array([50., 4., -3.]) + rng.normal(0, .2 if label else 3, 3)
            rows.append({"ID": f"ORDER{group:03}-A", "No": label,
                         "Std_IN_L": 50, "Std_IN_a": 4, "Std_IN_b": -3,
                         "Std_DY_L": 51, "Std_DY_a": 4.2, "Std_DY_b": -3.1,
                         **dict(zip(["Comp_L", "Comp_a", "Comp_b"], sample)),
                         **dict(zip(["MN_L", "MN_a", "MN_b"], sample)),
                         "DE": 1., "MN_DE": 1., "PASS": "*" if label else "", "NO_PASS": "" if label else "*"})
    df = pd.DataFrame(rows)
    for name in ["match_color_QD.csv", "MCwater(T).csv", "MCwater(T)TRUE.csv"]:
        df.to_csv(source / name, index=False)
    output = root / "run"
    train_all(source, output, folds=2, trees=5)
    return output
