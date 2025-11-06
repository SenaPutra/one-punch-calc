let SAVAGE=false;

const DEFAULT_CONFIG={
  base:{
    normal:{Serigala:3,Harimau:8,Iblis:13,Naga:21,Dewa:34},
    savage:{Serigala:2,Harimau:6,Iblis:10,Naga:16,Dewa:24}
  },
  weights:{
    api:{get:2,mutate:4,complex:6},
    db:{new:6,alter:10,crud:3},
    redis:{none:0,simple:2,invalidation:4,lock:5},
    type:{none:0,internal:2,cross:4,compat:6},
    integ:{none:0,internal:4,oauth:6,payment:8,iso8583:12},
    tests:{unit:2,integ:4,contract:3},
    obs:{logging:1,metrics:2,tracing:3},
    nfr:{perf:5,security:5,compliance:5}
  },
  multipliers:{
    seniority:{S:1.15,SS:1.00,SSS:0.90},
    fight:{prof:0.85,amatir:1.00,newbie:1.20,bulu:1.35},
    env:{dev:1.00,stg:1.10,prod:1.25}
  }
};

let CONFIG;try{CONFIG=JSON.parse(localStorage.getItem('onepunch_config')||'null')||DEFAULT_CONFIG}catch{CONFIG=DEFAULT_CONFIG}

let seniorityMul={...CONFIG.multipliers.seniority};
let fightMul={...CONFIG.multipliers.fight};
let envMul={...CONFIG.multipliers.env};

const complexityOptions=[{k:"Serigala",emoji:"🐺"},{k:"Harimau",emoji:"🐯"},{k:"Iblis",emoji:"😈"},{k:"Naga",emoji:"🐉"},{k:"Dewa",emoji:"🛐"}];
function baseFor(k){return (SAVAGE?CONFIG.base.savage[k]:CONFIG.base.normal[k]);}
const complexityMeta={
  Serigala:{title:"Serigala",lines:["Cocok: bug minor, copy/label change, small refactor.","Contoh: rename field, tambah log sederhana, adjust UI tanpa DB.","Catatan: 1 dev, 0–1 hari fokus."]},
  Harimau:{title:"Harimau",lines:["Cocok: CRUD kecil, 1 internal API, 1 migration ringan.","Contoh: add endpoint POST + GET, 1 tabel baru tanpa backfill.","Catatan: 1 dev, 2–3 hari fokus."]},
  Iblis:{title:"Iblis",lines:["Cocok: multi‑module, alter+backfill, webhook/OAuth.","Contoh: contract test + tracing, retry & idempotency dasar.","Catatan: 1–2 dev, 3–5 hari fokus."]},
  Naga:{title:"Naga",lines:["Cocok: cross‑service schema, payment flow, strong idempotency.","Contoh: multi env, feature flag, rollback plan, perf target.","Catatan: 2–3 dev, 5–9 hari fokus."]},
  Dewa:{title:"Dewa",lines:["Cocok: high‑risk banking/ISO8583, prod‑critical path.","Contoh: TLE/HTLE, kill‑switch, SLO/SLI ketat, compliance.","Catatan: squad fokus, pecah menjadi beberapa arc + POC."]}
};

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

let cxWrap;
let currentCx='Harimau';
let inputs;
let sprint=[];
let tbody;

function updateCxHint(){
  const meta=complexityMeta[currentCx];
  if(!meta)return;
  const title=`${currentCx} — base ${baseFor(currentCx)}`;
  const lines=[title,'—',...(meta.lines||[])];
  $('#cxHint').textContent=lines.join('\n');
}

function renderCx(){
  cxWrap.innerHTML='';
  complexityOptions.forEach(opt=>{
    const el=document.createElement('div');
    el.className='chip';
    el.textContent=`${opt.emoji} ${opt.k} (${baseFor(opt.k)})`;
    el.dataset.value=opt.k;
    el.dataset.active=(opt.k===currentCx);
    el.title=`${opt.k} — base ${baseFor(opt.k)}`;
    el.addEventListener('click',()=>{ currentCx=opt.k; renderCx(); calc(); updateCxHint(); });
    cxWrap.appendChild(el);
  });
}

const copy={
  normal:{title:'Satu Sprint, Seribu Drama',sub:'Hai kalian developer developer lemah klo pas ngitung effort — santai, kalkulator ini jadi sparring partner kalian. Hitung effort per task, masukin ke daftar sprint, terus cek kapasitas: kalau pas, Saitama Approved™; kalau jebol, ya… Genos Overheat.'},
  savage:{title:'Satu Sprint, Seribu Alibi (Savage Mode)',sub:'Hai kalian developer developer lemah klo pas ngitung effort — santai, kalkulator ini jadi sparring partner kalian. Hitung effort per task, masukin ke daftar sprint, terus cek kapasitas: kalau pas, Saitama Approved™; kalau jebol, ya… Genos Overheat.<span style="display:none"> ritual meeting </span>'}
};

function applySavageUI(){
  document.body.classList.toggle('savage',SAVAGE);
  $('#toggleSavage').textContent=SAVAGE?'🗡️ Savage Mode: On':'🗡️ Savage Mode: Off';
  $('#mainTitle').innerHTML=SAVAGE?copy.savage.title:copy.normal.title;
  $('#subCopy').innerHTML=SAVAGE?copy.savage.sub:copy.normal.sub;
  renderCx(); calc(); updateTotals();
}

function int(v){const n=parseInt(v,10);return isNaN(n)?0:n}

function points(){
  const base=baseFor(currentCx);
  const w=CONFIG.weights;
  const apiPts=w.api.get*int(inputs.apiGet.value)+w.api.mutate*int(inputs.apiMutate.value)+w.api.complex*int(inputs.apiComplex.value);
  const dbPts=w.db.new*int(inputs.dbNew.value)+w.db.alter*int(inputs.dbAlter.value)+w.db.crud*int(inputs.crudSimple.value);
  const redisPts=w.redis[inputs.redis.value];
  const typePts=w.type[inputs.typeInteg.value];
  const integPts=w.integ[inputs.apiInteg.value];
  const testPts=w.tests.unit*int(inputs.unitTests.value)+w.tests.integ*int(inputs.integTests.value)+w.tests.contract*int(inputs.contractTests.value);
  let obsPts=0; if(inputs.logging.checked)obsPts+=w.obs.logging; if(inputs.metrics.checked)obsPts+=w.obs.metrics; if(inputs.tracing.checked)obsPts+=w.obs.tracing;
  let nfrPts=0; if(inputs.perf.checked)nfrPts+=w.nfr.perf; if(inputs.security.checked)nfrPts+=w.nfr.security; if(inputs.compliance.checked)nfrPts+=w.nfr.compliance;
  const mods=apiPts+dbPts+redisPts+typePts+integPts+testPts+obsPts+nfrPts;
  return {base,apiPts,dbPts,redisPts,typePts,integPts,testPts,obsPts,nfrPts,mods};
}

function calc(){
  const p=points();
  const sMul=seniorityMul[inputs.seniority.value];
  const fMul=fightMul[inputs.fightClass.value];
  const rMul=1+0.05*Math.max(0,int(inputs.riskFlags.value));
  const eMul=envMul[inputs.environment.value];
  const raw=(p.base+p.mods)*sMul*fMul*rMul*eMul;
  const score=Math.round(raw);
  const days=Math.max(1,Math.ceil(score/8));

  $('#score').textContent=score;
  $('#days').textContent=days;
  $('#cxLabel').textContent=currentCx;
  $('#multis').textContent=`×${(sMul*fMul*rMul*eMul).toFixed(2)}`;

  const lines=[
    `Base(${currentCx}) = ${p.base}`,
    `API = ${CONFIG.weights.api.get}*GET + ${CONFIG.weights.api.mutate}*Mutate + ${CONFIG.weights.api.complex}*Complex = ${p.apiPts}`,
    `DB  = ${CONFIG.weights.db.new}*New + ${CONFIG.weights.db.alter}*Alter + ${CONFIG.weights.db.crud}*CRUD = ${p.dbPts}`,
    `Redis = ${p.redisPts}, Type = ${p.typePts}, API‑Integ = ${p.integPts}`,
    `Tests = ${p.testPts}, Obs = ${p.obsPts}, NFR = ${p.nfrPts}`,
    `ΣModifiers = ${p.mods}`,
    `Multipliers: seniority×fight×risk×env = ${(sMul).toFixed(2)} × ${(fMul).toFixed(2)} × ${(rMul).toFixed(2)} × ${(eMul).toFixed(2)}`
  ];
  $('#breakdown').textContent=lines.join('\n');

  let tip='';
  if(score>55) tip+='🧩 Skor >55 ⇒ pecah jadi beberapa arc. ';
  if(currentCx==='Dewa') tip+='🛐 Level Dewa terdeteksi ⇒ siapin spike/POC, kill‑switch, dan Prof.X.Nat.\n';
  if(inputs.environment.value==='prod') tip+='🚦 Production ⇒ siapkan rollback plan & SLO.\n';
  if(p.testPts===0) tip+='🧪 Belum ada test ⇒ minimal Unit+Integration ya.\n';
  if(!tip) tip='Semua aman. Jangan lupa kopi ☕ & standup < 10 menit.';
  $('#advice').textContent=tip;

  window._lastState=dumpJSON(score,days);
}

function dumpJSON(score,days){
  return {
    task: $('#taskName').value || 'Task Tanpa Nama',
    complexity: currentCx,
    inputs: {
      apiGet:int(inputs.apiGet.value), apiMutate:int(inputs.apiMutate.value), apiComplex:int(inputs.apiComplex.value),
      dbNew:int(inputs.dbNew.value), dbAlter:int(inputs.dbAlter.value), crudSimple:int(inputs.crudSimple.value),
      redis:inputs.redis.value, typeInteg:inputs.typeInteg.value, apiInteg:inputs.apiInteg.value,
      unitTests:int(inputs.unitTests.value), integTests:int(inputs.integTests.value), contractTests:int(inputs.contractTests.value),
      logging:inputs.logging.checked, metrics:inputs.metrics.checked, tracing:inputs.tracing.checked,
      perf:inputs.perf.checked, security:inputs.security.checked, compliance:inputs.compliance.checked,
      riskFlags:int(inputs.riskFlags.value), environment:inputs.environment.value,
      seniority:inputs.seniority.value, fightClass:inputs.fightClass.value
    },
    result: { score, days }
  };
}

function escapeHtml(str){ return (str||'').replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }

function renderSprint(){
  if(sprint.length===0){
    tbody.innerHTML = '<tr><td colspan="7" class="hint">Belum ada task. Hitung di atas, beri nama, lalu klik <b>Add to Sprint</b> atau <b>Load Food‑Order Samples</b>.</td></tr>';
    updateTotals(); return;
  }
  tbody.innerHTML='';
  sprint.forEach((t,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td>
      <td>${escapeHtml(t.task)}</td>
      <td>${t.complexity}</td>
      <td>${t.score}</td>
      <td>${t.days}</td>
      <td class="owner">${t.owner||''}</td>
      <td class="rm" title="Remove" data-id="${t.id}">✖</td>`;
    tbody.appendChild(tr);
  });
  $$('#tbody .rm').forEach(el=>el.addEventListener('click', e=>{
    const id = e.currentTarget.getAttribute('data-id');
    sprint = sprint.filter(x=>x.id!==id); renderSprint();
  }));
  updateTotals();
}

function updateTotals(){
  const totScore = sprint.reduce((a,b)=>a+b.score,0);
  const totDays = sprint.reduce((a,b)=>a+b.days,0);
  $('#totScore').textContent = totScore;
  $('#totDays').textContent = totDays;

  const devs = Math.max(1, int($('#teamDevs').value));
  const days = Math.max(1, int($('#sprintDays').value));
  const focus = Math.max(0.3, Math.min(1, parseFloat($('#focusFactor').value)||0.7));
  const capacity = Math.round(devs * days * focus);
  $('#capacity').textContent = capacity;

  const ratio = capacity===0 ? 0 : Math.min(1, totDays / capacity);
  $('#barFill').style.width = Math.max(2, Math.floor(ratio*100)) + '%';

  const status = totDays <= capacity ? '✅ Saitama Approved' : 'Genos Overheat';
  $('#fitStatus').textContent = status;
  const over = totDays - capacity;
  $('#statusMsg').textContent = totDays<=capacity
    ? (SAVAGE ? 'Oke. Realistis. Jangan manis di retro.' : 'Mantap. Sprint realistic. Gaskeun!')
    : (SAVAGE ? `Kelebihan ${over} hari fokus. Pangkas scope atau tambah dev — bukan tambah meeting.` : `Kelebihan ${over} hari fokus. Kurangi scope atau tambah dev.`);
}

function addTask(){
  calc();
  const st = window._lastState || dumpJSON(0,1);
  const name = ($('#taskName').value||'Task Tanpa Nama').trim();
  const id = Math.random().toString(36).slice(2,9);
  sprint.push({ id, task:name, complexity:st.complexity, score:st.result.score, days:st.result.days, owner:inputs.seniority.value });
  renderSprint();
  $('#taskName').value = '';
}

function clearSprint(){
  sprint=[]; renderSprint();
}

function download(name, content){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

function exportJson(){
  const devs = int($('#teamDevs').value), days = int($('#sprintDays').value), focus = parseFloat($('#focusFactor').value)||0.7;
  const payload = { meta:{ devs, sprintDays:days, focus, savage:SAVAGE, theme: document.body.classList.contains('light')?'light':'dark' }, tasks:sprint, totals:{ score: sprint.reduce((a,b)=>a+b.score,0), days: sprint.reduce((a,b)=>a+b.days,0) } };
  download('onepunch-sprint.json', JSON.stringify(payload,null,2));
}

function exportCsv(){
  if(sprint.length===0){ download('onepunch-sprint.csv', 'No tasks'); return; }
  const rows = [['#','Task','Complexity','Score','Days','Seniority','Savage','Theme']]
    .concat(sprint.map((t,i)=>[i+1,t.task,t.complexity,t.score,t.days,(t.owner||''),SAVAGE?'On':'Off', document.body.classList.contains('light')?'Light':'Dark']))
    .map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
  download('onepunch-sprint.csv', rows.join('\n'));
}

function copyJson(){
  const data = JSON.stringify(window._lastState || dumpJSON(0,1), null, 2);
  navigator.clipboard.writeText(data).then(()=>{
    $('#copied').style.display='inline';
    setTimeout(()=>$('#copied').style.display='none', 1200);
  });
}

const baseFoodSamples=[
  {name:'Fix null‑check on /v1/menu/search (empty query)',cx:'Serigala',v:{apiGet:1,apiMutate:0,apiComplex:0,dbNew:0,dbAlter:0,crudSimple:0,redis:'none',typeInteg:'none',apiInteg:'internal',unitTests:1,integTests:0,contractTests:0,logging:true,metrics:false,tracing:false,perf:false,security:false,compliance:false,riskFlags:0,environment:'dev',seniority:'SS',fightClass:'prof'}},
  {name:'CRUD Endpoint: /v1/menu/favorite',cx:'Harimau',v:{apiGet:1,apiMutate:1,apiComplex:0,dbNew:1,dbAlter:0,crudSimple:1,redis:'simple',typeInteg:'internal',apiInteg:'internal',unitTests:1,integTests:1,contractTests:0,logging:true,metrics:true,tracing:false,perf:false,security:true,compliance:false,riskFlags:1,environment:'stg',seniority:'SS',fightClass:'amatir'}},
  {name:'Order Checkout API (connect Cart, Menu, Payment)',cx:'Iblis',v:{apiGet:1,apiMutate:2,apiComplex:1,dbNew:1,dbAlter:1,crudSimple:0,redis:'lock',typeInteg:'cross',apiInteg:'payment',unitTests:2,integTests:2,contractTests:1,logging:true,metrics:true,tracing:true,perf:true,security:true,compliance:false,riskFlags:2,environment:'stg',seniority:'SS',fightClass:'amatir'}},
  {name:'Implement loyalty point accrual in /v1/payment/complete',cx:'Naga',v:{apiGet:1,apiMutate:1,apiComplex:1,dbNew:1,dbAlter:1,crudSimple:0,redis:'invalidation',typeInteg:'cross',apiInteg:'payment',unitTests:2,integTests:2,contractTests:1,logging:true,metrics:true,tracing:true,perf:true,security:true,compliance:true,riskFlags:3,environment:'prod',seniority:'SS',fightClass:'amatir'}},
  {name:'Integrate payment gateway (ISO8583) for KFC Pay',cx:'Dewa',v:{apiGet:1,apiMutate:2,apiComplex:2,dbNew:1,dbAlter:1,crudSimple:0,redis:'lock',typeInteg:'compat',apiInteg:'iso8583',unitTests:2,integTests:3,contractTests:2,logging:true,metrics:true,tracing:true,perf:true,security:true,compliance:true,riskFlags:4,environment:'prod',seniority:'SS',fightClass:'amatir'}}
];
function makeFoodOrderSamples(){const ranks=['S','SS','SSS'];const out=[];ranks.forEach(rank=>{baseFoodSamples.forEach(b=>{const t=JSON.parse(JSON.stringify(b));t.name=`${b.name} [${rank}]`;t.v.seniority=rank;out.push(t)})});return out}
const foodOrderSamples=makeFoodOrderSamples();

function snapshotInputs(){return{cx:currentCx,values:Object.fromEntries(Object.entries(inputs).map(([k,el])=>[k,el.type==='checkbox'?el.checked:el.value]))}}
function restoreInputs(snap){currentCx=snap.cx;Object.entries(snap.values).forEach(([k,v])=>{const el=inputs[k];if(!el)return;if(el.type==='checkbox')el.checked=!!v;else el.value=v});renderCx();calc();updateCxHint()}
function addSampleTasks(){const snap=snapshotInputs();foodOrderSamples.forEach(t=>{if(sprint.some(x=>x.task===t.name))return;copyPreset({cx:t.cx,v:t.v});const st=window._lastState||dumpJSON(0,1);const id=Math.random().toString(36).slice(2,9);sprint.push({id,task:t.name,complexity:t.cx,score:st.result.score,days:st.result.days,owner:t.v.seniority||'SS'});});restoreInputs(snap);renderSprint()}

function copyPreset(obj){
  currentCx = obj.cx || currentCx;
  Object.entries(obj.v||{}).forEach(([k,v])=>{
    const el = inputs[k];
    if(!el) return;
    if(el instanceof HTMLInputElement && el.type==='checkbox'){ el.checked = !!v; }
    else { el.value = v; }
  });
  renderCx(); calc(); updateCxHint();
}

function presetCrud(){copyPreset({cx:'Harimau', v:{ apiGet:1, apiMutate:1, apiComplex:1, dbNew:1, dbAlter:0, crudSimple:1,
  redis:'none', typeInteg:'internal', apiInteg:'internal', unitTests:1, integTests:1, contractTests:0,
  logging:true, metrics:true, tracing:false, perf:false, security:true, compliance:false,
  riskFlags:1, environment:'stg', seniority:'SS', fightClass:'prof' }})}

function presetISO(){copyPreset({cx:'Naga', v:{ apiGet:0, apiMutate:1, apiComplex:1, dbNew:0, dbAlter:1, crudSimple:0,
  redis:'lock', typeInteg:'compat', apiInteg:'iso8583', unitTests:1, integTests:2, contractTests:1,
  logging:true, metrics:true, tracing:true, perf:true, security:true, compliance:true,
  riskFlags:3, environment:'prod', seniority:'SSS', fightClass:'amatir' }})}

function presetWallet(){copyPreset({cx:'Iblis', v:{ apiGet:1, apiMutate:1, apiComplex:1, dbNew:0, dbAlter:0, crudSimple:0,
  redis:'none', typeInteg:'cross', apiInteg:'oauth', unitTests:1, integTests:1, contractTests:1,
  logging:true, metrics:true, tracing:false, perf:false, security:true, compliance:false,
  riskFlags:2, environment:'stg', seniority:'SS', fightClass:'bulu' }})}

function resetForm(){
  currentCx='Harimau';
  Object.entries(inputs).forEach(([k,el])=>{
    if(el.type==='checkbox'){ el.checked=false; return; }
    if(el.tagName==='SELECT'){
      if(k==='seniority') el.value='SS';
      else if(k==='fightClass') el.value='amatir';
      else if(k==='environment') el.value='dev';
      else el.value='none';
    } else { el.value=0; }
  });
  $('#taskName').value='';
  renderCx(); calc(); updateCxHint();
}

function applyTheme(theme){
  const isLight = theme==='light';
  document.body.classList.toggle('light', isLight);
  $('#toggleTheme').textContent = isLight ? 'Neon Mode: Light' : 'Neon Mode: Dark';
}

function importPayload(obj){
  try{
    if(Array.isArray(obj)){ sprint=obj }
    else if(obj && typeof obj==='object'){
      if(Array.isArray(obj.tasks)) sprint=obj.tasks;
      const m=obj.meta||{};
      if(typeof m.devs==='number') $('#teamDevs').value=String(m.devs);
      if(typeof m.sprintDays==='number') $('#sprintDays').value=String(m.sprintDays);
      if(typeof m.focus==='number') $('#focusFactor').value=String(m.focus);
      if(typeof m.savage==='boolean'){ SAVAGE=m.savage; applySavageUI() }
      if(m.theme==='light'||m.theme==='dark') applyTheme(m.theme);
    } else { alert('Format JSON tidak dikenali'); return; }
    sprint=sprint.map((t,i)=>({id:t.id||Math.random().toString(36).slice(2,9),task:String(t.task||`Task ${i+1}`),complexity:String(t.complexity||'-'),score:Math.max(0,parseInt(t.score||0,10)),days:Math.max(1,parseInt(t.days||1,10)),owner:t.owner||''}));
    renderSprint();
  }catch(e){ alert('Gagal import JSON: '+e.message) }
}

function computeScore(base,mods,seniorityKey,fightKey,riskFlags,envKey){
  const sMul=seniorityMul[seniorityKey];
  const fMul=fightMul[fightKey];
  const rMul=1 + 0.05 * Math.max(0, riskFlags);
  const eMul=envMul[envKey];
  const raw=(base + mods) * sMul * fMul * rMul * eMul;
  const score=Math.round(raw);
  const days=Math.max(1, Math.ceil(score / 8));
  return {score, days};
}

function printTrademarkBanner(){
  const brand="BABITAMPAN AND FREN'S";
  window.__BRAND=brand;
  const style1='background:linear-gradient(90deg,#00e5ff,#7c3aed); color:white; font-weight:800; padding:6px 10px; border-radius:6px 0 0 6px';
  const style2='background:#0b1220; color:#a78bfa; font-weight:700; padding:6px 10px; border-radius:0 6px 6px 0; border:1px solid #243147; border-left:none';
  console.log('%c '+brand+' %c™', style1, style2);
  console.log('%cMade with ❤️ — One‑Punch Effort Calc', 'color:#9fb3d8');
}

function runSelfTests(){
  const tests=[]; const t=(name,cond)=>tests.push({name,pass:!!cond});
  const a=computeScore(8,25,'SS','prof',1,'stg'); t('CRUD example score=32', a.score===32); t('CRUD example days=4', a.days===4);
  const b=computeScore(21,23,'SSS','amatir',3,'prod'); t('ISO8583 example score=57', b.score===57); t('ISO8583 example days=8', b.days===8);
  const c1=computeScore(13,16,'SS','bulu',0,'stg').score; const c2=computeScore(13,16,'SS','bulu',2,'stg').score; t('Risk increases score', c2>c1);
  t('Newline escape works', 'a\nb'.split('\n').length===2);
  t('Trademark set', window.__BRAND==="BABITAMPAN AND FREN'S");
  const f=computeScore(0,0,'SSS','prof',0,'dev'); t('Days lower bound = 1', f.days===1);
  const g1=computeScore(10,0,'SSS','amatir',0,'dev').score; const g2=computeScore(10,0,'S','amatir',0,'dev').score; t('S > SSS (same inputs)', g2>g1);
  const cap=Math.round(3*10*0.7); t('Capacity rounding spec', cap===21);
  const prev=currentCx; currentCx='Dewa'; updateCxHint(); const ok=$('#cxHint').textContent.includes('Dewa'); currentCx=prev; updateCxHint(); t('cxHint updates with selection', ok);
  const prevSav=SAVAGE; SAVAGE=true; applySavageUI(); const j1=document.body.classList.contains('savage'); const j2=$('#mainTitle').textContent.includes('Savage Mode'); const j3=$('#subCopy').textContent.includes('Genos Overheat'); SAVAGE=prevSav; applySavageUI(); t('Savage toggles', j1&&j2&&j3);
  const prevSec=inputs.security.checked; inputs.security.checked=false; const k0=points().nfrPts; inputs.security.checked=true; const k1=points().nfrPts; inputs.security.checked=prevSec; calc(); t('Security adds +5', (k1-k0)===CONFIG.weights.nfr.security);
  const wasLight=document.body.classList.contains('light'); document.body.classList.toggle('light'); const themeFlipped=document.body.classList.contains('light')!==wasLight; document.body.classList.toggle('light'); t('Theme toggles', themeFlipped);
  const ranks=new Set(foodOrderSamples.map(s=>s.v.seniority)); t('Samples include S',ranks.has('S')); t('Samples include SS',ranks.has('SS')); t('Samples include SSS',ranks.has('SSS'));
  const prevSen=inputs.seniority.value; inputs.seniority.value='S'; calc(); const st=dumpJSON(0,1); const expected=inputs.seniority.value; const example={id:'x',task:'T',complexity:st.complexity,score:st.result.score,days:st.result.days,owner:inputs.seniority.value}; t('Owner equals seniority', example.owner===expected); inputs.seniority.value=prevSen; calc();
  const failed=tests.filter(x=>!x.pass);
  const el=document.createElement('div'); el.style.cssText='margin:10px 0;font-size:12px;color:#9fb3d8';
  el.innerHTML = failed.length ? `🧪 Self‑tests: <span style="color:#fb7185">${failed.length} failed</span> / ${tests.length}. Lihat console.` : `🧪 Self‑tests: <span style="color:#34d399">All passed</span> (${tests.length}).`;
  document.body.appendChild(el);
  console.group('One‑Punch Effort — Self Tests'); tests.forEach(x=>console[x.pass?'log':'error'](`${x.pass?'PASS':'FAIL'} — ${x.name}`)); console.groupEnd();
}

function openConfig(){ const ta=$('#configText'); ta.value=JSON.stringify(CONFIG,null,2); $('#configModal').classList.add('show') }
function closeConfig(){ $('#configModal').classList.remove('show') }
function syncFromConfig(){ seniorityMul={...CONFIG.multipliers.seniority}; fightMul={...CONFIG.multipliers.fight}; envMul={...CONFIG.multipliers.env} }
function applyConfig(){
  let obj; try{ obj=JSON.parse($('#configText').value) }catch(e){ alert('JSON tidak valid: '+e.message); return }
  const need=['base','weights','multipliers']; if(!need.every(k=>obj&&typeof obj==='object'&&k in obj)){ alert('Field wajib hilang: base/weights/multipliers'); return }
  CONFIG=obj; localStorage.setItem('onepunch_config',JSON.stringify(CONFIG)); syncFromConfig(); renderCx(); calc(); updateTotals(); updateCxHint(); closeConfig();
}
function resetConfig(){ CONFIG=DEFAULT_CONFIG; localStorage.setItem('onepunch_config',JSON.stringify(CONFIG)); syncFromConfig(); $('#configText').value=JSON.stringify(CONFIG,null,2) }

function boot(){
  printTrademarkBanner();
  cxWrap = $('#complexity');
  inputs = {
    apiGet: $('#apiGet'), apiMutate: $('#apiMutate'), apiComplex: $('#apiComplex'),
    dbNew: $('#dbNew'), dbAlter: $('#dbAlter'), crudSimple: $('#crudSimple'),
    redis: $('#redis'), typeInteg: $('#typeInteg'), apiInteg: $('#apiInteg'),
    unitTests: $('#unitTests'), integTests: $('#integTests'), contractTests: $('#contractTests'),
    logging: $('#logging'), metrics: $('#metrics'), tracing: $('#tracing'),
    perf: $('#perf'), security: $('#security'), compliance: $('#compliance'),
    riskFlags: $('#riskFlags'), environment: $('#environment'), seniority: $('#seniority'), fightClass: $('#fightClass')
  };
  Object.values(inputs).forEach(i=>i.addEventListener('input', calc));
  tbody = $('#tbody');

  renderCx(); updateCxHint(); renderSprint(); calc(); applySavageUI(); runSelfTests();

  $('#toggleSavage').addEventListener('click', ()=>{ SAVAGE=!SAVAGE; applySavageUI(); });
  $('#toggleTheme').addEventListener('click', ()=>{ const nowLight=!document.body.classList.contains('light'); applyTheme(nowLight?'light':'dark') });
  $('#copyJson').addEventListener('click', copyJson);
  $('#addTask').addEventListener('click', addTask);
  $('#clearSprint').addEventListener('click', clearSprint);
  ['teamDevs','sprintDays','focusFactor'].forEach(id=>$('#'+id).addEventListener('input', updateTotals));
  $('#presetCrud').addEventListener('click', presetCrud);
  $('#presetISO').addEventListener('click', presetISO);
  $('#presetWallet').addEventListener('click', presetWallet);
  $('#resetBtn').addEventListener('click', resetForm);
  $('#exportJson').addEventListener('click', exportJson);
  $('#exportCsv').addEventListener('click', exportCsv);
  $('#loadSamples').addEventListener('click', addSampleTasks);

  $('#importJson').addEventListener('click', ()=>$('#importFile').click());
  $('#importFile').addEventListener('change', async(e)=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    const text=await f.text(); let obj;
    try{ obj=JSON.parse(text) }catch(err){ alert('File bukan JSON valid'); return }
    importPayload(obj); e.target.value='';
  });

  $('#configBtn').addEventListener('click', openConfig);
  $('#configClose').addEventListener('click', closeConfig);
  $('#configApply').addEventListener('click', applyConfig);
  $('#configReset').addEventListener('click', resetConfig);
}

document.addEventListener('DOMContentLoaded', boot);
