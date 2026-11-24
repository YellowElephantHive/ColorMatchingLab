# Demo walkthrough / 展示順序

Open `reports/ColorMatchingLab.html`; every page load starts in **English**. Choose **中文** for a Taiwan manufacturing audience. Switching language preserves the chosen experiment, model, threshold and sample during the current visit. Reloading returns to English.

## 1. Problem and process — 30 seconds

Introduce the textile color-matching project and its company deployment. Use the DY / MN / IN overview to explain how process knowledge informed the measurement inputs, reference standards and prediction target.

## 2. Results and errors — 60 seconds

Start with QD and Random Forest at threshold 0.50. Read PASS F1 together with NO-PASS recall. Select the false-acceptance matrix cell. The scatterplot and sample selector now show the relevant errors. Select a sample and compare the actual label with its OOF prediction.

Move the threshold to show the trade-off between false acceptances and false rejections, then reset it. Use the four-model comparison to explain model selection and the different quality-control priorities represented by each metric.

## 3. Live model — 60 seconds

Open the selected sample in Playground. Adjust ΔL, Δa or Δb and observe the score and decision surface. For water-repellent experiments, explain the final IN target and the DY CMC reference. The browser executes the fitted model directly, making the feature-to-prediction workflow visible.

Connect the changing decision surface to the manufacturing question: how do lightness and chromatic differences affect the acceptance decision? Keep the interaction focused on process understanding and model behavior.

## 4. Engineering — 30 seconds

Show the feature contract, work-order grouping, source audit and reproducible commands. The software exports models, metrics, per-row predictions and the split manifest. Python/browser arithmetic parity is tested. The single HTML works without a server and contains no third-party assets.

## 中文重點

- 製程知識：區分 DY、MN、IN 的量測與標準樣。
- 模型評估：用工單隔離的 OOF 結果說明，不合格召回率與誤判數一起看。
- 互動展示：選取真實案例，再改變 Lab 差值觀察模型反應。
- 工程能力：把特徵、訓練、推論、測試與展示拆開，保留來源與實驗證據。
- 企業應用：完整模型已於公司部署，結合製程知識、模型開發與工程交付經驗。
