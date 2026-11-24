(() => {
  'use strict';
  const report = JSON.parse(document.getElementById('report-data').textContent);
  const E = window.ColorLabEngine, $ = id => document.getElementById(id);
  const state = { experiment: 0, model: 'rf', threshold: .5, tab: 'results', filter: 'all', x: 2, y: 3, selected: 0,
    target: [50, 0, 0], reference: [50, 0, 0], delta: [0, 0, 0], surface: null };
  const names = ['DE', 'ΔL', 'Δa', 'Δb'];
  const exp = () => report.experiments[state.experiment];
  const pct = v => `${(v * 100).toFixed(1)}%`;
  const fixed = (v, d = 3) => Number(v).toFixed(d);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let scatterPoints = [], decisionGeometry = null, timer;

  function category(row) {
    const prediction = row.scores[state.model] >= state.threshold;
    return row.label ? (prediction ? 'tp' : 'fn') : (prediction ? 'fp' : 'tn');
  }
  function filtered() {
    return exp().samples.map((row, i) => ({row, i})).filter(({row}) => state.filter === 'all' || (state.filter === 'errors' ? ['fp', 'fn'].includes(category(row)) : category(row) === state.filter));
  }
  function chooseTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tab-panel').forEach(panel => panel.hidden = panel.id !== `tab-${tab}`);
    document.querySelectorAll('.nav').forEach(button => { button.classList.toggle('active', button.dataset.tab === tab); button.setAttribute('aria-current', button.dataset.tab === tab ? 'page' : 'false'); });
    if (tab === 'results') requestAnimationFrame(drawScatter);
    if (tab === 'playground') requestAnimationFrame(updateLive);
  }
  function switchExperiment(index) {
    state.experiment = index; state.selected = 0; state.filter = 'all'; $('filter').value = 'all'; state.surface = null;
    document.querySelectorAll('#experiments button').forEach((button, i) => { button.classList.toggle('active', i === index); button.setAttribute('aria-pressed', String(i === index)); });
    $('experiment-description').textContent = ({water_dy: '撥水製程，以染後 Lab 與色差特徵預測流程 PASS。', water_mn: '撥水製程，以中檢實測 MN 量測預測流程 PASS。'})[exp().id] || exp().description;
    $('stage-dy').classList.toggle('current', exp().sample_stage === 'DY');
    $('stage-mn').classList.toggle('current', exp().sample_stage === 'MN');
    $('stage-mn').style.opacity = exp().id === 'qd_dy' ? '.25' : '';
    $('sample-stage-label').textContent = `${exp().sample_stage} 樣本量測`;
    $('reference-inputs').hidden = exp().de_reference === 'Std_IN';
    loadCase(0); renderResults(); renderEngineering();
  }
  function renderResults() {
    const current = exp(), m = E.metrics(current.samples, state.model, state.threshold);
    $('threshold-value').textContent = state.threshold.toFixed(2);
    $('threshold-note').textContent = state.threshold === .5 ? 'OOF 評估 · 門檻 0.50' : '依目前門檻即時更新 OOF 指標';
    $('metric-f1').textContent = m.f1_pass.toFixed(3);
    $('metric-spread').textContent = state.threshold === .5 ? `各折 F1 標準差 ${current.models[state.model].fold_f1_std.toFixed(3)}` : '目前為互動門檻下的彙總 F1';
    $('metric-recall').textContent = pct(m.recall_no_pass);
    $('metric-samples').textContent = current.audit.usable_rows.toLocaleString();
    $('metric-groups').textContent = `${current.audit.base_work_orders} 個基礎工單 · ${current.audit.isolated_groups} 組`;
    $('metric-miss').textContent = m.fp;
    $('metric-miss-note').textContent = `共 ${current.audit.no_pass_rows} 筆實際不合格樣本`;
    for (const [key, label] of [['tn','正確攔下'],['fp','誤判放行'],['fn','誤判攔下'],['tp','正確放行']]) {
      $(`cm-${key}`).innerHTML = `${m[key]}<span>${label}</span>`;
      $(`cm-${key}`).classList.toggle('active', state.filter === key);
      $(`cm-${key}`).setAttribute('aria-label', `${label} ${m[key]} 筆，點選篩選`);
    }
    $('accuracy-note').textContent = `Accuracy ${pct(m.accuracy)}`;
    $('balance-note').textContent = `Balanced ${pct(m.balanced_accuracy)}`;
    $('comparison').innerHTML = Object.entries(current.models).map(([key, model]) => {
      const item = E.metrics(current.samples, key, state.threshold);
      return `<tr class="${key === state.model ? 'selected' : ''}" data-model="${key}"><td>${esc(model.name)}</td><td>${item.f1_pass.toFixed(3)}</td><td>${item.f1_macro.toFixed(3)}</td><td>${pct(item.recall_no_pass)}</td></tr>`;
    }).join('');
    const importance = current.models.rf.permutation_importance;
    const maximum = Math.max(...Object.values(importance).map(Math.abs), .001);
    $('importance').innerHTML = Object.entries(importance).map(([key, v]) => `<div class="imp-row"><span>${esc(key)}</span><div class="imp-track"><div class="imp-fill" style="width:${Math.abs(v)/maximum*100}%;background:${v < 0 ? '#d7a382' : '#429b91'}"></div></div><small>${v.toFixed(3)}</small></div>`).join('');
    const rows = filtered();
    if (rows.length && !rows.some(row => row.i === state.selected)) state.selected = rows[0].i;
    $('sample-select').innerHTML = rows.length ? rows.map(({row, i}) => `<option value="${i}">${esc(row.id)}</option>`).join('') : '<option value="">沒有符合條件的樣本</option>';
    $('sample-select').value = String(state.selected);
    $('sample-select').disabled = !rows.length;
    $('try-sample').disabled = !rows.length;
    $('plot-count').textContent = `${rows.length} / ${current.samples.length} 筆樣本`;
    showCase(rows.length > 0);
    if (state.tab === 'results') requestAnimationFrame(drawScatter);
  }
  function showCase(visible = true) {
    if (!visible) { $('case-detail').textContent = '沒有符合篩選條件的樣本。'; return; }
    const sample = exp().samples[state.selected], score = sample.scores[state.model];
    $('case-detail').innerHTML = `實際 <b>${sample.label ? 'PASS' : 'NO-PASS'}</b> · 預測 <b>${score >= state.threshold ? 'PASS' : 'NO-PASS'}</b><span>OOF PASS 分數 ${score.toFixed(3)} · fold ${sample.fold + 1}</span>`;
  }
  function canvasContext(id) {
    const canvas = $(id), width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return null;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
    return {canvas, ctx, width, height};
  }
  function axes(ctx, g, xLabel, yLabel, grid = true) {
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = g.left + g.w * i / 4, y = g.top + g.h * i / 4;
      if (grid) { ctx.strokeStyle = '#edf2f4'; ctx.beginPath();ctx.moveTo(x,g.top);ctx.lineTo(x,g.top+g.h);ctx.moveTo(g.left,y);ctx.lineTo(g.left+g.w,y);ctx.stroke(); }
      ctx.fillStyle = '#78909a';ctx.textAlign='center';ctx.fillText((g.xmin+(g.xmax-g.xmin)*i/4).toFixed(1),x,g.top+g.h+20);
      ctx.textAlign='right';ctx.fillText((g.ymax-(g.ymax-g.ymin)*i/4).toFixed(1),g.left-10,y+4);
    }
    ctx.fillStyle='#5a7882';ctx.textAlign='center';ctx.fillText(window.ColorLabI18n.translate(xLabel),g.left+g.w/2,g.top+g.h+41);
    ctx.save();ctx.translate(13,g.top+g.h/2);ctx.rotate(-Math.PI/2);ctx.fillText(window.ColorLabI18n.translate(yLabel),0,0);ctx.restore();
  }
  function drawScatter() {
    const setup = canvasContext('scatter'); if (!setup) return;
    const {ctx,width,height} = setup, all = exp().samples;
    const range = j => { const values = all.map(s => s.features[j]), lo = Math.min(...values), hi = Math.max(...values), pad = (hi-lo)*.08 || 1; return [lo-pad, hi+pad]; };
    const [xmin,xmax]=range(state.x), [ymin,ymax]=range(state.y);
    const g={left:57,top:15,w:width-75,h:height-67,xmin,xmax,ymin,ymax};
    axes(ctx,g,names[state.x],names[state.y]);
    const toX=v=>g.left+(v-xmin)/(xmax-xmin)*g.w, toY=v=>g.top+(ymax-v)/(ymax-ymin)*g.h;
    ctx.strokeStyle='#c4d5d9';ctx.setLineDash([3,4]);ctx.beginPath();
    if (xmin<0 && xmax>0){ctx.moveTo(toX(0),g.top);ctx.lineTo(toX(0),g.top+g.h);}
    if (ymin<0 && ymax>0){ctx.moveTo(g.left,toY(0));ctx.lineTo(g.left+g.w,toY(0));}ctx.stroke();ctx.setLineDash([]);
    scatterPoints=[];
    for(const {row,i} of filtered()) {
      const x=toX(row.features[state.x]), y=toY(row.features[state.y]), error=['fp','fn'].includes(category(row));
      ctx.beginPath();ctx.arc(x,y,i===state.selected?6:3.6,0,Math.PI*2);
      ctx.fillStyle=row.label?'#159d898c':'#df865a9c';ctx.fill();
      if(error || i===state.selected){ctx.strokeStyle=i===state.selected?'#132f3d':'#ba513d';ctx.lineWidth=i===state.selected?2:1;ctx.stroke();}
      scatterPoints.push({x,y,i,row});
    }
    if(!scatterPoints.length){ctx.fillStyle='#79909a';ctx.textAlign='center';ctx.fillText(window.ColorLabI18n.translate('沒有符合篩選條件的樣本'),width/2,height/2);}
  }
  function nearest(event) {
    const box=$('scatter').getBoundingClientRect(), x=event.clientX-box.left, y=event.clientY-box.top;
    let candidate=null,best=100;
    for(const p of scatterPoints){const d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;candidate=p;}}
    return candidate;
  }
  function loadCase(index) {
    state.selected=index;const item=exp().samples[index];
    state.target=[...item.target];state.reference=[...item.reference];state.delta=item.sample.map((v,i)=>v-item.target[i]);
    state.surface=null;
    ['l','a','b'].forEach((key,i)=>{$(`target-${key}`).value=state.target[i];$(`ref-${key}`).value=state.reference[i];});
    for(let i=0;i<3;i++){
      const bound=Math.ceil(Math.max(i===0?8:10,Math.abs(state.delta[i])+1));
      $(`delta-${i}`).min=-bound;$(`delta-${i}`).max=bound;$(`delta-${i}`).value=state.delta[i];
    }
    if(state.tab==='playground')updateLive();
  }
  function readLive() {
    const ids=['l','a','b'];
    for(const prefix of exp().de_reference==='Std_IN'?['target']:['target','ref']) {
      for(const key of ids){const el=$(`${prefix}-${key}`);if(el.value.trim()==='' || !el.checkValidity())throw new Error('請填入有效 Lab：L* 介於 0–100，a* / b* 介於 -160–160。');}
    }
    state.target=ids.map(k=>Number($(`target-${k}`).value));
    state.reference=exp().de_reference==='Std_IN'?[...state.target]:ids.map(k=>Number($(`ref-${k}`).value));
    state.delta=[0,1,2].map(i=>Number($(`delta-${i}`).value));
    const sample=state.target.map((v,i)=>v+state.delta[i]);
    if(sample[0]<0||sample[0]>100||Math.abs(sample[1])>160||Math.abs(sample[2])>160)throw new Error('調整後的量測超出 Lab 輸入範圍，請縮小差值。');
    return sample;
  }
  function updateLive() {
    let sample;
    try { sample=readLive();$('input-error').hidden=true; } catch(error) {
      $('input-error').textContent=error.message;$('input-error').hidden=false;
      $('live-decision').textContent='輸入需修正';$('live-score').textContent='—';
      $('live-context').textContent='修正輸入後重新計算。';$('range-warning').hidden=true;$('live-features').textContent='';
      const invalid=canvasContext('decision');if(invalid){invalid.ctx.clearRect(0,0,invalid.width,invalid.height);}decisionGeometry=null;return;
    }
    [0,1,2].forEach(i=>$(`delta-value-${i}`).textContent=`${state.delta[i]>=0?'+':''}${state.delta[i].toFixed(2)}`);
    $('target-swatch').style.background=E.rgb(state.target);$('sample-swatch').style.background=E.rgb(sample);
    const x=E.features(state.target,sample,state.reference),model=exp().models[state.model].portable,score=E.predict(model,x);
    $('live-features').innerHTML=x.map((v,i)=>`<span>${names[i]} <b>${v.toFixed(3)}</b></span>`).join('');
    $('live-decision').textContent=score>=state.threshold?'預測 PASS':'預測 NO-PASS';
    $('live-decision').style.color=score>=state.threshold?'#008b77':'#ba6237';
    $('live-score').textContent=score.toFixed(3);
    $('live-context').textContent=`${exp().models[state.model].name} · 門檻 ${state.threshold.toFixed(2)} · 量測 Lab [${sample.map(v=>v.toFixed(2)).join(', ')}]`;
    const outside=x.some((v,i)=>{const b=exp().feature_bounds[report.feature_names[i]];return v<b[0]||v>b[1];});
    $('range-warning').hidden=!outside;$('range-warning').textContent='特徵範圍：目前至少一項輸入超出資料中的觀測範圍。';
    drawDecision(model);
  }
  function drawDecision(model) {
    const setup=canvasContext('decision');if(!setup)return;
    const {ctx,width,height}=setup;
    const extent=Math.max(5,Math.ceil(Math.max(Math.abs(state.delta[1]),Math.abs(state.delta[2]))+1));
    const g={left:56,top:12,w:width-76,h:height-64,xmin:-extent,xmax:extent,ymin:-extent,ymax:extent};
    const key=JSON.stringify([state.experiment,state.model,state.target,state.reference,state.delta[0],extent]);
    const N=41;
    if(!state.surface||state.surface.key!==key){
      const values=[];
      for(let row=0;row<N;row++)for(let col=0;col<N;col++){
        const a=g.xmin+(col+.5)/N*2*extent,b=g.ymax-(row+.5)/N*2*extent;
        const sample=[state.target[0]+state.delta[0],state.target[1]+a,state.target[2]+b];
        values.push(Math.abs(sample[1])<=160&&Math.abs(sample[2])<=160?E.predict(model,E.features(state.target,sample,state.reference)):null);
      }
      state.surface={key,values};
    }
    const blend=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
    for(let row=0;row<N;row++)for(let col=0;col<N;col++){
      const p=state.surface.values[row*N+col];
      const color=p===null?[230,234,235]:p<.5?blend([201,109,68],[245,247,242],p*2):blend([245,247,242],[0,133,116],(p-.5)*2);
      ctx.fillStyle=`rgb(${color.join(',')})`;ctx.fillRect(g.left+col/N*g.w,g.top+row/N*g.h,g.w/N+1,g.h/N+1);
    }
    ctx.strokeStyle='#173c4265';ctx.lineWidth=.7;
    for(let row=0;row<N;row++)for(let col=0;col<N;col++){
      const p=state.surface.values[row*N+col];if(p===null)continue;
      const v=p>=state.threshold;
      if(col<N-1&&state.surface.values[row*N+col+1]!==null&&v!==(state.surface.values[row*N+col+1]>=state.threshold)){ctx.beginPath();ctx.moveTo(g.left+(col+1)/N*g.w,g.top+row/N*g.h);ctx.lineTo(g.left+(col+1)/N*g.w,g.top+(row+1)/N*g.h);ctx.stroke();}
      if(row<N-1&&state.surface.values[(row+1)*N+col]!==null&&v!==(state.surface.values[(row+1)*N+col]>=state.threshold)){ctx.beginPath();ctx.moveTo(g.left+col/N*g.w,g.top+(row+1)/N*g.h);ctx.lineTo(g.left+(col+1)/N*g.w,g.top+(row+1)/N*g.h);ctx.stroke();}
    }
    axes(ctx,g,'Δa · 紅綠差','Δb · 黃藍差',false);
    const x=g.left+(state.delta[1]+extent)/(2*extent)*g.w,y=g.top+(extent-state.delta[2])/(2*extent)*g.h;
    ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#13333d';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fillStyle='#13333d';ctx.fill();
    decisionGeometry=g;
  }
  function renderEngineering() {
    const a=exp().audit;
    const items=[['原始檔案列數',a.raw_rows],['移除完全重複紀錄',a.duplicate_rows_removed],['排除未標記 / 衝突',a.missing_label_rows+a.conflicting_label_rows],['實際納入評估',a.usable_rows],['PASS / NO-PASS',`${a.pass_rows} / ${a.no_pass_rows}`],['基礎工單 / 隔離群組',`${a.base_work_orders} / ${a.isolated_groups}`],['各折訓練與驗證群組重疊','0'],['原始 DE 與重算差距 > 0.3',a.stored_de_mismatch_gt_0_3],['特徵使用補值', '否']];
    $('audit').innerHTML=items.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
    $('provenance').textContent=JSON.stringify({generated_at:report.generated_at,seed:report.seed,folds:report.folds,source:a.filename,sha256:a.sha256,de_reference:exp().de_reference,environment:report.environment,source_hashes:report.source_hashes},null,2);
  }
  function exportCSV() {
    const rows=[['experiment','model','threshold','scope','n','pass_f1','macro_f1','no_pass_recall','accuracy','tn','fp','fn','tp']];
    report.experiments.forEach(e=>Object.keys(e.models).forEach(key=>{const m=E.metrics(e.samples,key,state.threshold);rows.push([e.id,key,state.threshold,'grouped_out_of_fold',e.samples.length,m.f1_pass,m.f1_macro,m.recall_no_pass,m.accuracy,m.tn,m.fp,m.fn,m.tp]);}));
    const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`color-matching-oof-threshold-${state.threshold.toFixed(2)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('experiments').innerHTML=report.experiments.map((e,i)=>`<button data-experiment="${i}">${esc(e.name)}</button>`).join('');
  $('delta-controls').innerHTML=['ΔL · 明度差','Δa · 紅綠差','Δb · 黃藍差'].map((name,i)=>`<div class="delta-row"><div><label for="delta-${i}">${name}</label><output id="delta-value-${i}" for="delta-${i}">0.00</output></div><input id="delta-${i}" type="range" min="-10" max="10" step="any" value="0"></div>`).join('');
  $('run-label').textContent=`工單隔離 · ${report.folds}-fold OOF`;
  $('footer-run').textContent=`Run ${report.generated_at.slice(0,10)} · seed ${report.seed}`;
  document.querySelectorAll('.nav').forEach(button=>button.addEventListener('click',()=>chooseTab(button.dataset.tab)));
  $('experiments').addEventListener('click',event=>{const button=event.target.closest('button');if(button)switchExperiment(Number(button.dataset.experiment));});
  $('model').addEventListener('change',()=>{state.model=$('model').value;state.surface=null;renderResults();if(state.tab==='playground')updateLive();});
  $('threshold').addEventListener('input',()=>{state.threshold=Number($('threshold').value);renderResults();if(state.tab==='playground')updateLive();});
  $('reset-threshold').addEventListener('click',()=>{$('threshold').value=.5;state.threshold=.5;renderResults();if(state.tab==='playground')updateLive();});
  ['axis-x','axis-y'].forEach((id,i)=>$(id).addEventListener('change',()=>{state[i?'y':'x']=Number($(id).value);drawScatter();}));
  $('filter').addEventListener('change',()=>{state.filter=$('filter').value;renderResults();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=state.filter===button.dataset.filter?'all':button.dataset.filter;$('filter').value=state.filter;renderResults();}));
  $('sample-select').addEventListener('change',()=>{state.selected=Number($('sample-select').value);showCase();drawScatter();});
  $('scatter').addEventListener('mousemove',event=>{const item=nearest(event);$('tooltip').hidden=!item;if(item){$('tooltip').innerHTML=`${esc(item.row.id)}<br>實際 ${item.row.label?'PASS':'NO-PASS'} · OOF ${item.row.scores[state.model].toFixed(3)}`;$('tooltip').style.left=`${Math.max(0,Math.min(item.x+12,$('scatter').clientWidth-210))}px`;$('tooltip').style.top=`${Math.max(0,item.y-53)}px`;}});
  $('scatter').addEventListener('mouseleave',()=>$('tooltip').hidden=true);
  $('scatter').addEventListener('click',event=>{const item=nearest(event);if(item){state.selected=item.i;$('sample-select').value=item.i;showCase();drawScatter();}});
  $('comparison').addEventListener('click',event=>{const row=event.target.closest('[data-model]');if(row){state.model=row.dataset.model;$('model').value=state.model;state.surface=null;renderResults();}});
  $('try-sample').addEventListener('click',()=>{loadCase(state.selected);chooseTab('playground');});
  $('load-selected').addEventListener('click',()=>loadCase(state.selected));
  $('example-pass').addEventListener('click',()=>loadCase(exp().samples.findIndex(s=>s.label===1)));
  $('example-fail').addEventListener('click',()=>loadCase(exp().samples.findIndex(s=>s.label===0)));
  document.querySelectorAll('.lab-inputs input').forEach(input=>input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(updateLive,60);}));
  $('decision').addEventListener('click',event=>{if(!decisionGeometry)return;const rect=$('decision').getBoundingClientRect(),g=decisionGeometry,x=event.clientX-rect.left,y=event.clientY-rect.top;if(x<g.left||x>g.left+g.w||y<g.top||y>g.top+g.h)return;const values=[g.xmin+(x-g.left)/g.w*(g.xmax-g.xmin),g.ymax-(y-g.top)/g.h*(g.ymax-g.ymin)];values.forEach((v,i)=>{$(`delta-${i+1}`).value=Math.max(Number($(`delta-${i+1}`).min),Math.min(Number($(`delta-${i+1}`).max),v));});updateLive();});
  $('export').addEventListener('click',exportCSV);
  let resize;window.addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{if(state.tab==='results')drawScatter();if(state.tab==='playground')updateLive();},100);});
  window.addEventListener('colorlab:language',()=>{if(state.tab==='results')drawScatter();if(state.tab==='playground')updateLive();});
  switchExperiment(0);
})();
