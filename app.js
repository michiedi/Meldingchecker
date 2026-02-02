let schema = null;
let answers = {};
let order = [];
let idx = 0;

function valToBool(v) {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return null;
}

function shouldAsk(q, ans) {
  // Only show if route matches (if specified)
  if (q.route && ans.CAT_01 && q.route !== ans.CAT_01) return false;

  // Simple required_if: {question, equals}
  if (q.required_if && q.required_if.question) {
    const v = ans[q.required_if.question];
    // Note: strict equality to support numbers/strings as defined in schema
    return v === q.required_if.equals;
  }
  return true;
}

function findNextIndex(start) {
  for (let i = start; i < order.length; i++) {
    if (shouldAsk(order[i], answers)) return i;
  }
  return -1;
}

function collectCurrent() {
  const q = order[idx];
  const el = document.getElementById(q.id);
  const validationEl = document.getElementById('validation-msg');
  if (validationEl) validationEl.textContent = '';

  if (!el) return false;
  let v = el.value;
  if (v === '') {
    if (validationEl) validationEl.textContent = 'Gelieve een antwoord te geven.';
    return false;
  }
  if (q.answer_type === 'number') v = Number(v);
  answers[q.id] = v;
  return true;
}

function evaluate() {
  const res = document.getElementById('result');
  res.classList.remove('hidden');

  // Clear any previous styling
  res.style.background = '';
  res.style.border = '';

  // 1) Exclusion gates
  const blocks = schema.decision_logic.exclusion_gate.blocking_questions;
  const blocked = blocks.some(b => valToBool(answers[b]) === true);
  if (blocked) {
    res.style.background = '#fee2e2';
    res.style.border = '1px solid #ef4444';
    res.innerHTML = `❌ <strong>Geen melding mogelijk.</strong><br>Minstens één uitsluitingsgrond (art. 6) is van toepassing.`;
    return;
  }

  // 2) Route rules
  const route = answers.CAT_01;
  const rule = schema.decision_logic.route_rules.find(r => r.route === route);
  if (!rule) {
    res.style.background = '#fff7ed';
    res.style.border = '1px solid orange';
    res.innerHTML = `⚠ Geen route-logica gevonden.`;
    return;
  }

  const failed = [];

  // Boolean required_true checks (only if answered or applicable)
  (rule.required_true || []).forEach(qid => {
    if (answers[qid] === undefined) return; // skip if not applicable
    if (valToBool(answers[qid]) !== true) failed.push(qid);
  });

  // Numeric checks (only if question was asked / has an answer)
  (rule.required_numeric || []).forEach(n => {
    if (answers[n.id] === undefined) return; // not asked => don't validate
    const val = Number(answers[n.id]);
    if (Number.isNaN(val)) { failed.push(n.id); return; }
    if (n.rule === 'max' && !(val <= n.value)) failed.push(n.id);
    if (n.rule === 'min' && !(val >= n.value)) failed.push(n.id);
    if (n.rule === 'exclusiveMax' && !(val < n.value)) failed.push(n.id);
  });

  if (failed.length) {
    res.style.background = '#fff7ed';
    res.style.border = '1px solid #fb923c';
    res.innerHTML = `⚠ <strong>Voorwaarden niet gehaald</strong><br>Mislukte controles: ${failed.join(', ')}`;
    return;
  }

  res.style.background = '#dcfce7';
  res.style.border = '1px solid #4ade80';
  res.innerHTML = `✅ <strong>Melding lijkt mogelijk</strong> volgens route <strong>${route}</strong>.<br>Onder voorbehoud van lokale voorschriften.`;
}

function clearContainer(container) {
  while (container.firstChild) container.removeChild(container.firstChild);
}

function renderQuestion(q) {
  const c = document.getElementById('question-container');
  clearContainer(c);

  const div = document.createElement('div');
  div.className = 'question';

  const label = document.createElement('label');
  label.setAttribute('for', q.id);
  label.textContent = q.text || '';
  label.style.display = 'block';
  div.appendChild(label);

  // validation message element
  let validationMsg = document.getElementById('validation-msg');
  if (!validationMsg) {
    validationMsg = document.createElement('div');
    validationMsg.id = 'validation-msg';
    validationMsg.className = 'note';
    validationMsg.style.color = '#b91c1c';
    validationMsg.style.marginTop = '8px';
  }

  let inputEl;

  if (q.answer_type === 'boolean') {
    inputEl = document.createElement('select');
    inputEl.id = q.id;

    const optEmpty = document.createElement('option');
    optEmpty.value = '';
    optEmpty.textContent = '-- kies --';
    inputEl.appendChild(optEmpty);

    const optTrue = document.createElement('option');
    optTrue.value = 'true';
    optTrue.textContent = 'Ja';
    inputEl.appendChild(optTrue);

    const optFalse = document.createElement('option');
    optFalse.value = 'false';
    optFalse.textContent = 'Nee';
    inputEl.appendChild(optFalse);
  } else if (q.answer_type === 'enum') {
    inputEl = document.createElement('select');
    inputEl.id = q.id;

    const optEmpty = document.createElement('option');
    optEmpty.value = '';
    optEmpty.textContent = '-- kies --';
    inputEl.appendChild(optEmpty);

    (q.options || []).forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      // Use provided label but as textContent to avoid HTML injection
      opt.textContent = o.label || o.value;
      inputEl.appendChild(opt);
    });
  } else if (q.answer_type === 'number') {
    inputEl = document.createElement('input');
    inputEl.id = q.id;
    inputEl.type = 'number';
    inputEl.step = 'any';
  } else {
    inputEl = document.createElement('input');
    inputEl.id = q.id;
    inputEl.type = 'text';
  }

  // Prefill if we have an answer for this question
  if (answers[q.id] !== undefined && answers[q.id] !== null) {
    // For selects, set the value (string). For numbers, set string form.
    inputEl.value = String(answers[q.id]);
  }

  // Enter key submits current question
  inputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      document.getElementById('next-btn').click();
    }
  });

  div.appendChild(inputEl);
  div.appendChild(validationMsg);
  c.appendChild(div);

  // Prev/Next UI
  document.getElementById('prev-btn').classList.toggle('hidden', idx === 0);
  document.getElementById('next-btn').classList.remove('hidden');

  // Focus first input for convenience
  inputEl.focus();
}

async function boot() {
  try {
    schema = await loadSchema();
    order = schema.questionnaire.questions;

    idx = findNextIndex(0);
    if (idx === -1) {
      const c = document.getElementById('question-container');
      c.textContent = 'Geen vragen beschikbaar.';
      return;
    }
    renderQuestion(order[idx]);

    document.getElementById('next-btn').onclick = () => {
      if (!collectCurrent()) return;
      const ni = findNextIndex(idx + 1);
      if (ni === -1) { evaluate(); return; }
      idx = ni; renderQuestion(order[idx]);
    };

    document.getElementById('prev-btn').onclick = () => {
      let pi = idx - 1;
      // Move backwards to previous question that should be asked
      while (pi >= 0 && !shouldAsk(order[pi], answers)) pi--;
      if (pi >= 0) { idx = pi; renderQuestion(order[idx]); }
    };

  } catch (err) {
    // Show friendly error in UI
    const c = document.getElementById('question-container');
    clearContainer(c);
    const errDiv = document.createElement('div');
    errDiv.style.color = '#b91c1c';
    errDiv.textContent = 'Kon het schema niet laden. Probeer later opnieuw.';
    c.appendChild(errDiv);
    console.error('Boot error:', err);
  }
}

document.addEventListener('DOMContentLoaded', boot);
