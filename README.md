# Chroma — Color Matching Lab

A textile quality-prediction project combining manufacturing process knowledge, color-difference modeling and bilingual interactive visualization.

The complete project model was deployed at the company. This portfolio presents the process understanding, feature design, model evaluation and software engineering behind the work through a reproducible experimental workflow and hands-on showcase.

## 直接展示 / Open the showcase

**[Open the live demo](https://yellowelephanthive.github.io/ColorMatchingLab/)**

For an offline copy, open **`index.html`** in a browser, or double-click **`Open Demo.command`** on macOS. No Python, server, internet connection or notebook is required for the exported HTML.

Every page load starts in **English**. The prominent **English / 中文** control switches the interface, chart labels, validation messages and methodology for the current visit. Reloading always returns to English.

- **Results / 結果探索:** switch experiments and models; change the threshold; inspect errors through the confusion matrix and color-difference scatterplot; export the current OOF metrics as CSV.
- **Playground / 互動預測:** load a real sample, adjust Lab measurements and inspect an actual model decision surface. The browser executes the fitted random forest or other selected model, without an API call.
- **Engineering / 工程與方法:** explore process knowledge, feature design, project highlights and the reproducible engineering workflow.

## Measured results

Run `artifacts/run-01`, seed 42, five grouped folds, threshold 0.50. The table reports Random Forest out-of-fold predictions.

| Experiment | Evaluated rows | Base work orders | PASS F1 | Macro F1 | NO-PASS recall |
| --- | ---: | ---: | ---: | ---: | ---: |
| QD, post-dyeing | 999 | 535 | 0.8692 | 0.8244 | 79.45% |
| Water-repellent, post-dyeing | 494 | 191 | 0.8339 | 0.7938 | 75.76% |
| Water-repellent, measured MN | 189 | 76 | 0.7238 | 0.6893 | 79.71% |

The showcase compares four models using PASS F1, macro F1, NO-PASS recall and per-sample error analysis. Interactive thresholds reveal the trade-off between false acceptances and false rejections.

Data preparation, feature definitions and evaluation details are documented in [the experiment report](docs/RESULTS.md).

## Reproduce

Requires Python 3.12 or 3.13 and [uv](https://docs.astral.sh/uv/). Node.js is used only by the Python/browser parity tests.

```bash
uv sync --frozen --extra dev --no-editable
uv run --no-sync pytest -q
```

The test suite runs with synthetic fixtures. To rerun training, place your authorized source CSVs in `data/raw/`; the original company files and work-order mapping are kept outside this public repository.

```bash

# Import the original archive if it is available locally:
uv run --no-sync colorlab import-data "legacy/ColorMatchingPrograms/Match Color Data.7z"

# A new run directory preserves previous results.
uv run --no-sync colorlab train --out artifacts/run-02
uv run --no-sync colorlab export --run artifacts/run-02 --out reports/ColorMatchingLab.html
```

`--no-editable` avoids macOS hidden-file issues with editable-package `.pth` files. After changing source files, repeat `uv sync --frozen --extra dev --no-editable --reinstall-package color-matching-lab`, or use `PYTHONPATH=src .venv/bin/python -m colorlab.cli ...` while developing.

The bundled `uv.lock` pins the environment. Training uses fixed settings, not a search over validation scores. Existing completed run directories are never silently overwritten.

## Prediction interface

```bash
uv run --no-sync colorlab predict --run artifacts/run-01 --input examples/qd_prediction.json
uv run --no-sync colorlab serve --run artifacts/run-01 --port 8765
```

The optional local server exposes:

| Endpoint | Behavior |
| --- | --- |
| `GET /` | Interactive showcase |
| `GET /health` | Service state and model availability |
| `GET /api/summary` | Metrics, audit and environment metadata |
| `POST /api/predict` | Validated batch inference, 1–1,000 samples |
| `GET /docs` | Interactive API schema |

Request example:

```json
{
  "experiment": "qd_dy",
  "model": "rf",
  "threshold": 0.5,
  "records": [{"target": [50, 4, -3], "sample": [51, 5, -3]}]
}
```

For either water experiment, also provide `reference: [L, a, b]`, the DY standard used for CMC. `target` always means the final IN standard; `sample` means the measurement at the selected stage. PASS scores are uncalibrated model outputs.

## Structure

```text
src/colorlab/
  data.py          Source validation, labels, deduplication, grouping
  features.py      Shared CMC(2:1) and signed Lab feature contract
  modeling.py      Grouped OOF evaluation, baselines, portable models
  inference.py     Model inference with validated feature construction
  api.py           Optional local FastAPI service
  cli.py           Import, train, predict, export and serve commands
  report.py        Self-contained HTML packaging
  web/             Bilingual interface and browser inference engine
tests/             Features, labels, groups, API and browser/Python parity
examples/          Explicitly illustrative prediction requests
docs/              Results, design decisions and demo walkthrough
legacy/            Unmodified supplied notebooks, workbooks and archive
data/raw/          Extracted original CSVs
artifacts/run-01/  Models, metrics, OOF predictions and split manifest
reports/           Portable interactive showcase
index.html         Published self-contained GitHub Pages demo
```

The `legacy/`, `data/raw/`, `artifacts/` and `reports/` directories are local working outputs. They are excluded from Git along with the complete project ZIP and private source manifest. The published `index.html` contains anonymized sample IDs, Lab measurements and browser model arrays, with order IDs, recipes and customer/material identifiers omitted.

## Update GitHub Pages

GitHub Pages serves `index.html` from the root of `main`. After editing the interface, regenerate the page from a local run and push the updated source and HTML:

```bash
uv run --no-sync colorlab export --run artifacts/run-01 --out index.html
git add src/colorlab/web index.html
git commit -m "Update interactive showcase"
git push
```

## Verification

The test suite checks label ambiguity, invalid inputs, measured MN column selection, group isolation, metric reconstruction, run preservation, API errors and valid inference. Browser inference and CMC arithmetic are compared against Python across every delivered evaluated sample and all four candidate models. Tests without the private source data use explicitly synthetic fixtures and do not claim model performance.

Manual browser checks cover real sample selection, error filters, threshold changes, all three experiments, English/Chinese switching, input validation and the responsive layout. Details are recorded in `docs/VALIDATION.md`.

## Method references

- [scikit-learn grouped cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html#stratifiedgroupkfold)
- [scikit-image CMC color difference](https://scikit-image.org/docs/stable/api/skimage.color.html#skimage.color.deltaE_cmc)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)

The original company data/code has no newly asserted public license. New documentation does not imply permission to redistribute the original materials.
