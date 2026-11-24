# Validation record

Validated on the local macOS environment on 2026-11-24. This verifies the experimental reconstruction, not the company deployment.

## Automated checks

- 24 Python tests passed, including data-label ambiguity, invalid Lab inputs, measured MN feature selection, group unions, one OOF prediction per row, metric reconstruction, preservation of completed runs and API contracts.
- Python/browser inference parity passed for all 1,682 experiment rows and all four model types. The number counts rows across experiments, including overlapping water DY/MN sources; it is not a count of independent physical samples.
- CMC and signed feature values matched at absolute tolerance 1e-9; portable model scores matched Python at 1e-10. Metrics also matched at score thresholds 0.10, 0.50 and 0.90.
- CLI batch prediction completed using `examples/qd_prediction.json` (illustrative input values).
- JavaScript syntax checks passed for the interface, language layer and inference engine.
- A non-blocking Starlette warning notes a future test-client migration from httpx to httpx2. API tests pass in the locked environment.

## Interactive browser checks

The exported HTML was served unchanged over loopback for browser QA. No frontend CDN, external font, analytics request or model API is needed for its interactions.

- QD at threshold 0.50 displayed F1 0.869 and 999 samples.
- Selecting the false-acceptance confusion-matrix cell filtered the scatterplot to exactly 75 samples.
- Selecting a sample and opening Playground populated the measurements and executed the fitted model.
- Threshold 0.95 recalculated QD RF PASS F1 to 0.577 and displayed the exploratory-threshold notice; reset restored 0.50.
- Water DY with Logistic Regression displayed F1 0.827 and 494 samples.
- Measured MN selected the measured-MN experiment description and populated the DY reference inputs.
- Entering L*=120 displayed a validation message and cleared the prediction. Loading the selected sample restored valid inference.
- Moving ΔL to +8.00 changed a water Logistic example score from 0.202 to 0.000.
- English/中文 switched labels, controls, explanatory content and validation messages. Every page load defaults to English. Selecting Chinese switches the current page to Chinese; reloading returns to English with the English control selected. Engineering content in English had no remaining Chinese text except the intentional 中文 switch.
- Both desktop and 390×844 mobile views were inspected. After fixing the process diagram's minimum width, the mobile document width equaled the viewport width with no page-wide overflow.
- Browser error logs were empty after the tested interactions.

Direct `file://` navigation is disabled by the automated in-app browser. The standalone file was therefore validated through its identical localhost-served contents and through self-containment checks; automated direct file-protocol navigation was not completed. The user can open the delivered HTML in a normal local browser.

## Provenance

`artifacts/run-01/checksums.json` covers the original saved training artifacts. `report.json` records training-time Python source hashes, input CSV hashes, versions, seed and fold details. Presentation/API packaging was subsequently refined without changing those fitted model results. Historical input ZIP entries are preserved byte for byte.

Model-parameter tuning, an independent temporal holdout, probability calibration, production load tests and validation of the deployed company model were outside this reconstruction.
