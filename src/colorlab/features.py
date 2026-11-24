"""One feature contract shared by training, CLI and API prediction.

DE uses CMC(2:1), with the reference color first (the metric is asymmetric).
Signed Lab deltas always mean measurement minus the final IN standard.
"""
import numpy as np
from skimage.color import deltaE_cmc

FEATURES = ("DE", "dL", "da", "db")


def validate_lab(values, name="Lab"):
    array = np.asarray(values, dtype=float)
    if array.ndim == 1:
        array = array.reshape(1, -1)
    if array.ndim != 2 or array.shape[1] != 3 or not np.isfinite(array).all():
        raise ValueError(f"{name} must contain finite [L, a, b] triples")
    if ((array[:, 0] < 0) | (array[:, 0] > 100)).any():
        raise ValueError(f"{name} L must be between 0 and 100")
    if (np.abs(array[:, 1:]) > 160).any():
        raise ValueError(f"{name} a and b must be between -160 and 160")
    return array


def make_features(target, sample, de_reference=None):
    target = validate_lab(target, "target")
    sample = validate_lab(sample, "sample")
    reference = target if de_reference is None else validate_lab(de_reference, "DE reference")
    if target.shape != sample.shape or target.shape != reference.shape:
        raise ValueError("target, sample and DE reference must have matching shapes")
    de = deltaE_cmc(reference, sample, kL=2, kC=1)
    return np.column_stack([de, sample - target])
