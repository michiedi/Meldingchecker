let schema=null;
let answers={};
let order=[];
let idx=0;

function valToBool(v){
  if(typeof v==='boolean') return v;
  if(v==='true'||v===true) return true;
  if(v==='false'||v===false) return false;
  return null;
}

function shouldAsk(q,ans){
  // Alleen tonen als de route matcht (indien gespecificeerd)
  if(q.route && ans.CAT_01 && q.route!==ans.CAT_01) return false;

  // Eenvoudige required_if: {question, equals}
  if(q.required_if && q.required_if.question){
    const v = ans[q.required_if.question];
    return v === q.required_if.equals;
  }
  return true;
}

function renderQuestion(q){
  const c=document.getElementById('question-container');
  c.innerHTML='';
  const div=document.createElement('div');
  div.className='question';

  let input='';
  if(q.answer_type==='boolean'){
    input = `<select id="${q.id}">
      <option value="">-- kies --</option>
      <option value="true">Ja</option>
      <option value="false">Nee</option>
    </select>`;
  } else if(q.answer_type==='enum'){
    input = `<select id="${q.id}">
      <option value="">-- kies --</option>
      ${(q.options||[]).map(o=>`<option value="${o.value}">${o.label}</option>`).join('')}
    </select>`;
  } else if(q.answer_type==='number'){
    input = `<input id="${q.id}" type="number" step="any" />`;
  } else {
    input = `<input id="${q.id}" type="text" />`;
  }

  div.innerHTML = `<label>${q.text}</label>${input}`;
  c.appendChild(div);

  document.getElementById('prev-btn').classList.toggle('hidden', idx===0);
  document.getElementById('next-btn').classList.remove('hidden');
}

function findNextIndex(start){
  for(let i=start;i<order.length;i++){
    if(shouldAsk(order[i],answers)) return i;
  }
  return -1;
}

function collectCurrent(){
  const q = order[idx];
  const el = document.getElementById(q.id);
  if(!el) return false;
  let v = el.value;
  if(v==='') return false;
  if(q.answer_type==='number') v = Number(v);
  answers[q.id]=v;
  return true;
}

function evaluate(){
  const res=document.getElementById('result');
  res.classList.remove('hidden');

  // 1) Uitsluitingsgronden
  const blocks = schema.decision_logic.exclusion_gate.blocking_questions;
  const blocked = blocks.some(b => valToBool(answers[b])===true);
  if(blocked){
    res.style.background='#fee2e2';
    res.style.border='1px solid #ef4444';
    res.innerHTML = `❌ <strong>Geen melding mogelijk.</strong><br>Minstens één uitsluitingsgrond (art. 6) is van toepassing.`;
    return;
  }

  // 2) Route-regels
  const route = answers.CAT_01;
  const rule = schema.decision_logic.route_rules.find(r=>r.route===route);
  if(!rule){
    res.style.background='#fff7ed'; res.style.border='1px solid orange';
    res.innerHTML = `⚠ Geen route-logica gevonden.`;
    return;
  }

  const failed = [];

  // Alleen booleans valideren als ze beantwoord zijn of standaard zonder required_if
  (rule.required_true||[]).forEach(qid=>{
    if(answers[qid] === undefined) return; // overslaan indien niet van toepassing
    if(valToBool(answers[qid])!==true) failed.push(qid);
  });

  // Alleen numerieke checks uitvoeren als er een waarde is (dus vraag was gesteld)
  (rule.required_numeric||[]).forEach(n=>{
    if(answers[n.id] === undefined) return; // niet gesteld => niet valideren
    const val = Number(answers[n.id]);
    if(Number.isNaN(val)) { failed.push(n.id); return; }
    if(n.rule==='max' && !(val<=n.value)) failed.push(n.id);
    if(n.rule==='min' && !(val>=n.value)) failed.push(n.id);
    if(n.rule==='exclusiveMax' && !(val<n.value)) failed.push(n.id);
  });

  if(failed.length){
    res.style.background='#fff7ed'; res.style.border='1px solid #fb923c';
    res.innerHTML = `⚠ <strong>Voorwaarden niet gehaald</strong><br>Mislukte controles: ${failed.join(', ')}`;
    return;
  }

  res.style.background='#dcfce7'; res.style.border='1px solid #4ade80';
  res.innerHTML = `✅ <strong>Melding lijkt mogelijk</strong> volgens route <strong>${route}</strong>.<br>Onder voorbehoud van lokale voorschriften.`;
}

async function boot(){
  schema = await loadSchema();
  order = schema.questionnaire.questions;

  idx = findNextIndex(0);
  renderQuestion(order[idx]);

  document.getElementById('next-btn').onclick = ()=>{
    if(!collectCurrent()){ alert('Gelieve een antwoord te geven.'); return; }
    const ni = findNextIndex(idx+1);
    if(ni===-1){ evaluate(); return; }
    idx = ni; renderQuestion(order[idx]);
  };

  document.getElementById('prev-btn').onclick = ()=>{
    let pi = idx-1; while(pi>=0 && !shouldAsk(order[pi],answers)) pi--;
    if(pi>=0){ idx = pi; renderQuestion(order[idx]); }
  };
}

document.addEventListener('DOMContentLoaded', boot);
