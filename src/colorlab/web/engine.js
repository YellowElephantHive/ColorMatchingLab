(function (root) {
  'use strict';
  function cmc(reference, sample) {
    const [L1, a1, b1] = reference, [L2, a2, b2] = sample;
    const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
    let h = Math.atan2(b1, a1); if (h < 0) h += 2 * Math.PI;
    const degrees = h * 180 / Math.PI;
    const T = degrees >= 164 && degrees <= 345
      ? .56 + .2 * Math.abs(Math.cos(h + 168 * Math.PI / 180))
      : .36 + .4 * Math.abs(Math.cos(h + 35 * Math.PI / 180));
    const F = Math.sqrt(C1 ** 4 / (C1 ** 4 + 1900));
    const SL = L1 < 16 ? .511 : .040975 * L1 / (1 + .01765 * L1);
    const SC = .638 + .0638 * C1 / (1 + .0131 * C1);
    const SH = SC * (F * T + 1 - F);
    const hue2 = Math.max(2 * (C1 * C2 - a1 * a2 - b1 * b2), 0);
    return Math.sqrt(((L1 - L2) / (2 * SL)) ** 2 + ((C1 - C2) / SC) ** 2 + hue2 / SH ** 2);
  }
  function features(target, sample, reference = target) {
    return [cmc(reference, sample), ...sample.map((v, i) => v - target[i])];
  }
  function predict(model, x) {
    if (model.kind === 'rf') {
      const converted = x.map(Math.fround);
      let total = 0;
      for (const tree of model.trees) {
        let node = 0;
        while (tree.l[node] !== -1) node = converted[tree.f[node]] <= tree.t[node] ? tree.l[node] : tree.r[node];
        total += tree.p[node];
      }
      return total / model.trees.length;
    }
    if (model.kind === 'logistic') {
      const z = x.reduce((a, v, i) => a + (v - model.mean[i]) / model.scale[i] * model.coef[i], model.intercept);
      return 1 / (1 + Math.exp(-z));
    }
    if (model.kind === 'majority') return model.score;
    return x[0] <= model.cutoff ? 1 : 0;
  }
  function metrics(samples, model, threshold) {
    let tn = 0, fp = 0, fn = 0, tp = 0;
    for (const row of samples) {
      const prediction = row.scores[model] >= threshold;
      if (row.label) prediction ? tp++ : fn++;
      else prediction ? fp++ : tn++;
    }
    const div = (a, b) => b ? a / b : 0;
    const f1 = div(2 * tp, 2 * tp + fp + fn), f0 = div(2 * tn, 2 * tn + fp + fn);
    return { tn, fp, fn, tp, accuracy: div(tp + tn, samples.length), f1_pass: f1,
      f1_macro: (f1 + f0) / 2, recall_no_pass: div(tn, tn + fp), recall_pass: div(tp, tp + fn),
      precision_pass: div(tp, tp + fp), balanced_accuracy: (div(tn, tn + fp) + div(tp, tp + fn)) / 2 };
  }
  function rgb(lab) {
    let y = (lab[0] + 16) / 116, x = lab[1] / 500 + y, z = y - lab[2] / 200;
    const inv = v => v ** 3 > .008856 ? v ** 3 : (v - 16 / 116) / 7.787;
    x = .95047 * inv(x); y = inv(y); z = 1.08883 * inv(z);
    const gamma = v => Math.round(255 * Math.max(0, Math.min(1, v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)));
    return `rgb(${[3.2404542*x-1.5371385*y-.4985314*z,-.969266*x+1.8760108*y+.041556*z,.0556434*x-.2040259*y+1.0572252*z].map(gamma).join(',')})`;
  }
  const api = { cmc, features, predict, metrics, rgb };
  root.ColorLabEngine = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
