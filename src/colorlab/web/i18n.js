(function (root) {
  'use strict';
  const strings = {
    "結果探索": "Results",
    "互動預測": "Playground",
    "工程與方法": "Engineering",
    "從染整製程": "Textile process knowledge",
    "製程知識 × 機器學習": "Manufacturing × machine learning",
    "匯出評估 CSV": "Export metrics CSV",
    "在染整流程中，": "Understand color variation.",
    "提前辨識對色風險。": "Anticipate quality risk.",
    "以色差特徵預測流程合格標記，探索哪些樣本容易誤判，": "Predict process acceptance from color measurements. Explore errors",
    "以及模型判定如何隨量測變化。": "and see how model decisions change with the measurements.",
    "染後量測": "After dyeing",
    "撥水中檢": "Intermediate check",
    "成品對色": "Final color check",
    "預測目標：原始流程 PASS / NO-PASS": "Target: original process PASS / NO-PASS",
    "QD · 染後": "QD · Dyeing",
    "撥水 · 染後": "Water-repellent · Dyeing",
    "撥水 · 中檢實測": "Water-repellent · MN",
    "一般 QD 製程，以染後量測預測流程 PASS。": "QD process: predict process PASS from post-dyeing measurements.",
    "撥水製程，以染後量測預測流程 PASS；不使用補值的 MN 欄位。": "Water-repellent process: predict PASS from post-dyeing measurements. Imputed MN fields are not used.",
    "僅使用 TRUE 檔的實測 MN 量測，預測原始流程 PASS 標記。": "Measured MN values from the TRUE dataset only, predicting the original process PASS label.",
    "模型": "Model",
    "PASS 判定門檻": "PASS threshold",
    "重設": "Reset",
    "NO-PASS 召回率": "NO-PASS recall",
    "實際不合格中，被辨識出的比例": "Share of actual failures correctly identified",
    "驗證樣本": "Evaluated samples",
    "誤判為合格": "False acceptances",
    "目前為互動門檻下的彙總 F1": "Pooled F1 at the exploratory threshold",
    "色差與判定": "Color differences & decisions",
    "實際合格": "Actual PASS",
    "實際不合格": "Actual NO-PASS",
    "○ 誤判": "○ Error",
    "X 軸": "X axis",
    "Y 軸": "Y axis",
    "Δa · 紅綠差": "Δa · Red–green",
    "Δb · 黃藍差": "Δb · Yellow–blue",
    "ΔL · 明度差": "ΔL · Lightness",
    "DE · CMC 色差": "DE · CMC difference",
    "篩選": "Filter",
    "所有樣本": "All samples",
    "所有誤判": "All errors",
    "不合格誤判為合格": "False acceptances",
    "合格誤判為不合格": "False rejections",
    "正確辨識不合格": "Correct NO-PASS",
    "正確辨識合格": "Correct PASS",
    "點選樣本查看預測；顏色為真實標記": "Select a point; colors show actual labels",
    "選取樣本": "Selected sample",
    "在互動預測中開啟": "Open in playground",
    "每筆預測皆來自未見過該工單的模型。": "Each prediction excludes its work order from training.",
    "點選矩陣，查看對應樣本。": "Select a matrix cell to inspect its samples.",
    "預測不合格": "Predicted NO-PASS",
    "預測合格": "Predicted PASS",
    "實際": "Actual",
    "預測": "Predicted",
    "不合格": "NO-PASS",
    "合格": "PASS",
    "正確攔下": "Correct rejection",
    "誤判放行": "False acceptance",
    "誤判攔下": "False rejection",
    "正確放行": "Correct acceptance",
    "模型與基準比較": "Models & baselines",
    "同一組資料分割": "Identical folds",
    "哪些特徵影響 RF 表現？": "What drives RF performance?",
    "改變量測，觀察判定邊界。": "Change a measurement. Explore the boundary.",
    "載入選取案例": "Load selected sample",
    "標準與量測": "Reference & measurement",
    "IN 成品標準": "Final IN standard",
    "DY 樣本量測": "DY measurement",
    "MN 樣本量測": "MN measurement",
    "IN 標準 Lab": "Final IN standard · Lab",
    "DY 色差參考 Lab": "DY color-difference reference · Lab",
    "合格案例": "PASS example",
    "不合格案例": "NO-PASS example",
    "目前明度差下的判定分布": "Decision surface at the current lightness difference",
    "ΔL 固定 · Δa / Δb 可變": "Fixed ΔL · Varying Δa / Δb",
    "較低 PASS 分數": "Lower PASS score",
    "較高 PASS 分數": "Higher PASS score",
    "完整資料模型的即時試算": "Live, full-data model",
    "PASS 模型分數": "PASS model score",
    "預測 PASS": "Predicted PASS",
    "預測 NO-PASS": "Predicted NO-PASS",
    "輸入需修正": "Check the input",
    "修正輸入後重新計算。": "Correct the input to recalculate.",
    "請填入有效 Lab：L* 介於 0–100，a* / b* 介於 -160–160。": "Enter valid Lab values: L* from 0–100 and a* / b* from -160–160.",
    "調整後的量測超出 Lab 輸入範圍，請縮小差值。": "The adjusted measurement is outside the Lab input range. Reduce the difference.",
    "沒有符合條件的樣本": "No matching samples",
    "沒有符合篩選條件的樣本。": "No samples match this filter.",
    "沒有符合篩選條件的樣本": "No samples match this filter",
    "可追溯的資料，可重現的結果。": "Traceable data. Reproducible results.",
    "原始資料": "Source data",
    "唯讀輸入 · SHA-256": "Read-only inputs · SHA-256",
    "特徵契約": "Feature contract",
    "CMC(2:1) + 有號 Lab 差": "CMC(2:1) + signed Lab differences",
    "工單隔離": "Group isolation",
    "5-fold OOF · 無群組重疊": "5-fold OOF · Zero group overlap",
    "模型與證據": "Models & evidence",
    "模型檔 · 逐筆預測 · 分割紀錄": "Models · Predictions · Fold manifest",
    "互動展示": "Interactive showcase",
    "離線 HTML · CLI · API": "Offline HTML · CLI · API",
    "明確定義標記": "Explicit labels",
    "隔離相關樣本": "Related samples stay together",
    "同一基礎工單（含 A/B 後綴）與完全相同 Lab 輸入留在同一折。": "Base work orders, including A/B suffixes, and identical Lab inputs stay in the same fold.",
    "統一特徵計算": "One feature definition",
    "DE 重算 CMC(2:1)；ΔL、Δa、Δb 為量測減 IN 標準。撥水 DE 以 DY 標準為參考。": "DE is recomputed with CMC(2:1). Signed Lab differences subtract the final IN standard. Water-repellent DE uses the DY reference.",
    "MN 使用實測值": "Measured MN inputs",
    "可重現入口": "Reproduce the experiment",
    "模型設定固定，seed 42。完整版本與資料雜湊會隨每次執行記錄。": "Fixed model settings and seed 42. Each run records dependency versions and source-data hashes.",
    "實驗來源與執行資訊": "Sources & run information",
    "原始檔案列數": "Source rows",
    "移除完全重複紀錄": "Exact duplicates removed",
    "排除未標記 / 衝突": "Unlabeled / conflicting rows excluded",
    "實際納入評估": "Rows evaluated",
    "基礎工單 / 隔離群組": "Base orders / isolated groups",
    "各折訓練與驗證群組重疊": "Train / validation group overlap",
    "原始 DE 與重算差距 > 0.3": "Stored vs. recomputed DE gap > 0.3",
    "特徵使用補值": "Imputed features used",
    "否": "No",
    "主要導覽": "Main navigation",
    "選擇實驗": "Choose an experiment",
    "選取散佈圖樣本": "Select a scatterplot sample",
    "染後 DY、中檢 MN、成品 IN 製程": "Dyeing DY, intermediate MN and final IN process",
    "色差散佈圖，可選取樣本；下方亦提供樣本選單": "Interactive color-difference scatterplot; a sample selector is also available below",
    "固定明度差下，紅綠差與黃藍差的模型判定分布；可用左側滑桿調整": "Decision surface at fixed lightness; adjust the red–green and yellow–blue differences with the sliders",
    "語言": "Language",
    "到機器學習應用": "Applied machine learning",
    "企業對色預測專案": "Textile quality prediction",
    "完整模型已於公司部署": "Full model deployed at the company",
    "製程分析 · 模型評估 · 互動展示": "Process analysis · ML evaluation · Interactive demo",
    "涵蓋染後、中檢與終檢的流程判定。": "Process decisions across dyeing, intermediate and final checks.",
    "OOF 評估 · 門檻 0.50": "OOF evaluation · Threshold 0.50",
    "依目前門檻即時更新 OOF 指標": "OOF metrics updated at the selected threshold",
    "判定結果與誤判分析": "Decisions & error analysis",
    "調整 PASS 門檻，觀察誤判放行與誤判攔下的取捨。": "Adjust the PASS threshold to explore false-acceptance and false-rejection trade-offs.",
    "使用相同資料分割，比較機器學習模型、多數類基準與 CMC 色差規則。": "Compare ML models, the majority baseline and a CMC reference rule on identical data splits.",
    "以驗證集 permutation importance，觀察打亂各項特徵後 PASS F1 的平均變化。": "Held-out permutation importance shows the average change in PASS F1 after shuffling each feature.",
    "以本次資料訓練的模型即時試算，調整 Lab 量測即可觀察預測反應，離線也能操作。": "Explore a model fitted to the displayed dataset. Adjust Lab measurements to see predictions change instantly, including offline.",
    "色塊以 D65 / sRGB 呈現標準樣與量測的近似色彩。": "D65 / sRGB swatches visualize the reference and measured colors.",
    "色面呈現不同色差組合的模型判定。點選色面，可直接調整 Δa / Δb。": "Explore model decisions across color-difference combinations. Click the surface to adjust Δa / Δb.",
    "特徵範圍：目前至少一項輸入超出資料中的觀測範圍。": "Feature range: at least one input is outside the observed data range.",
    "將製程資料處理、特徵設計、模型評估、推論與視覺化整合成可重現的工程流程。": "An integrated, reproducible workflow for process data, feature design, model evaluation, inference and visualization.",
    "資料處理與評估規模": "Data preparation & evaluation",
    "依 DY 與 MN 製程階段，選取對應量測建立模型比較。": "Stage-specific DY and MN measurements support the model comparisons.",
    "從製程資料到模型應用": "From process data to model applications",
    "整理 PASS / NO-PASS 標記，處理缺值、重複與衝突紀錄。": "Validate PASS / NO-PASS labels and handle missing, duplicate and conflicting records.",
    "依製程階段選取 DY 或 MN 量測，將實測來源與補值來源分開管理。": "Select DY or MN measurements by process stage and manage measured and imputed sources separately.",
    "成果可追溯": "Traceable outputs",
    "每次執行產生模型檔、逐筆預測、資料分割與來源雜湊，方便比較與重跑。": "Each run exports models, per-sample predictions, fold assignments and source hashes for comparison and reproduction.",
    "專案亮點": "Project highlights",
    "製程知識與特徵設計": "Process knowledge & feature design",
    "結合染整流程、Lab 量測與 CMC 色差，將現場對色判定轉化為可建模的資料問題，涵蓋 QD 與撥水加工情境。": "Connect textile processes, Lab measurements and CMC color differences to model quality decisions across QD and water-repellent finishing.",
    "企業應用": "Enterprise application",
    "專案完整模型已於公司部署。本作品透過製程分析、模型比較與即時試算，呈現從實驗開發到企業應用的技術經驗。": "The complete project model was deployed at the company. Process analysis, model comparisons and live inference demonstrate experience spanning experimentation and enterprise application.",
    "工程化與互動展示": "Software engineering & interactive visualization",
    "整合可重跑的訓練流程、Python 推論介面、模型一致性測試與中英文互動視覺化，讓模型成果可以直接操作與說明。": "Reproducible training, Python inference interfaces, model-parity tests and bilingual visualization turn model results into a hands-on demonstration.",
    "技術方法與執行資訊": "Methodology & run details",
    "結果頁呈現工單分組的 OOF 評估；互動頁使用本次完整資料訓練的模型。PASS 為流程合格標記，畫面數值為模型分數。": "Results use work-order-grouped OOF evaluation; the playground uses a model fitted to this full dataset. PASS denotes process acceptance, and displayed scores are model outputs.",
    "撥水製程，以染後 Lab 與色差特徵預測流程 PASS。": "Water-repellent process: predict process PASS from post-dyeing Lab and color-difference features.",
    "撥水製程，以中檢實測 MN 量測預測流程 PASS。": "Water-repellent process: predict process PASS from measured intermediate MN values."
};
  let language = 'en';
  const sources = new WeakMap(), attributes = new WeakMap();
  function translate(value) {
    if (language === 'zh') return value;
    const core = value.trim();
    if (Object.hasOwn(strings, core)) return value.replace(core, strings[core]);
    return value
      .replace(/工單隔離 · (\d+)-fold OOF/g,'Order-isolated · $1-fold OOF')
      .replace(/各折 F1 標準差 ([\d.]+)/g,'Fold F1 standard deviation $1')
      .replace(/(\d+) 個基礎工單 · (\d+) 組/g,'$1 base orders · $2 groups')
      .replace(/共 (\d+) 筆實際不合格樣本/g,'Out of $1 actual NO-PASS samples')
      .replace(/(\d+) \/ (\d+) 筆樣本/g,'$1 / $2 samples')
      .replace(/OOF PASS 分數/g,'OOF PASS score')
      .replace(/實際 /g,'Actual ').replace(/預測 /g,'Predicted ')
      .replace(/ · 門檻 /g,' · Threshold ').replace(/ · 量測 Lab /g,' · Measured Lab ')
      .replace(/(正確攔下|誤判放行|誤判攔下|正確放行) (\d+) 筆，點選篩選/g,(_,name,n)=>`${strings[name]}: ${n} samples. Select to filter`);
  }
  function localize() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (['SCRIPT','STYLE','PRE','CODE'].includes(node.parentElement.tagName) || node.parentElement.closest('[data-no-i18n]')) continue;
      const previous = sources.get(node), text = node.nodeValue;
      const source = previous && previous.output === text ? previous.source : text;
      const output = translate(source);
      sources.set(node, {source, output});
      if (output !== text) node.nodeValue = output;
    }
    document.querySelectorAll('[aria-label]').forEach(element => {
      const text = element.getAttribute('aria-label'), previous = attributes.get(element);
      const source = previous && previous.output === text ? previous.source : text, output = translate(source);
      attributes.set(element,{source,output});if(output!==text)element.setAttribute('aria-label',output);
    });
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === language;
      button.classList.toggle('active', active);button.setAttribute('aria-pressed', String(active));
    });
  }
  function set(next) {
    language=next;
    localize();window.dispatchEvent(new CustomEvent('colorlab:language'));
  }
  let queued=false;
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;localize();});}});
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>set(button.dataset.language)));
    localize();observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.dispatchEvent(new CustomEvent('colorlab:language'));
  });
  root.ColorLabI18n={translate,localize,get language(){return language;}};
})(globalThis);
