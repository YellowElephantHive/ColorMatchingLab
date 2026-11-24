import numpy as np
import pandas as pd
import pytest
from colorlab.data import EXPERIMENTS, isolated_groups, load_experiment, parse_labels
from colorlab.features import make_features


def test_identical_colors_and_signed_deltas():
    np.testing.assert_allclose(make_features([50, 5, -8], [50, 5, -8]), 0, atol=1e-7)
    np.testing.assert_allclose(make_features([50, 5, -8], [51, 3, -5])[0, 1:], [1, -2, 3])


def test_cmc_reference_is_not_interchangeable():
    one = make_features([20, 40, 10], [65, 5, -30])[0, 0]
    two = make_features([65, 5, -30], [20, 40, 10])[0, 0]
    assert abs(one - two) > 1


@pytest.mark.parametrize("sample", [[101, 0, 0], [30, float("nan"), 0], [30, 200, 0], [1, 2]])
def test_invalid_lab_fails(sample):
    with pytest.raises(ValueError):
        make_features([50, 0, 0], sample)


def test_missing_and_conflicting_labels_are_not_failures():
    frame = pd.DataFrame({"PASS": ["*", None, None, "*"], "NO_PASS": [None, "*", None, "*"]})
    y, valid, audit = parse_labels(frame)
    assert y[valid].tolist() == [1, 0]
    assert valid.tolist() == [True, True, False, False]
    assert audit == {"missing_label_rows": 1, "conflicting_label_rows": 1}


def test_unknown_label_is_rejected():
    with pytest.raises(ValueError):
        parse_labels(pd.DataFrame({"PASS": ["yes"], "NO_PASS": [""]}))


def test_grouping_unions_order_suffixes_and_identical_measurements():
    frame = pd.DataFrame({"ID": ["one-A", "one-B", "two-A", "three-A"]})
    lab = np.array([[50, 1, 1], [51, 2, 2], [51, 2, 2], [52, 3, 3]], float)
    groups, orders = isolated_groups(frame, lab, lab, lab)
    assert groups[0] == groups[1] == groups[2]
    assert groups[3] != groups[0]
    assert orders.tolist() == ["one", "one", "two", "three"]


def test_mn_uses_measured_columns_and_preserves_source(tmp_path):
    row = {"ID": "x-A", "PASS": "*", "NO_PASS": "", "Std_IN_L": 50., "Std_IN_a": 0., "Std_IN_b": 0.,
           "Std_DY_L": 51., "Std_DY_a": 0., "Std_DY_b": 0., "Comp_L": 60., "Comp_a": 2., "Comp_b": 2.,
           "MN_L": 52., "MN_a": 1., "MN_b": -1., "MN_DE": .5, "DE": 3.}
    path = tmp_path / "MCwater(T)TRUE.csv"
    pd.DataFrame([row, row, {**row, "ID": "y", "PASS": ""}]).to_csv(path, index=False)
    original = path.read_bytes()
    data = load_experiment(tmp_path, EXPERIMENTS[2])
    assert path.read_bytes() == original
    assert data["audit"]["duplicate_rows_removed"] == 1
    assert data["audit"]["missing_label_rows"] == 1
    np.testing.assert_allclose(data["X"][0, 1:], [2., 1., -1.])
