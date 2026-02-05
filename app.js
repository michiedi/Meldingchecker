function evaluate(){
  const res=document.getElementById('result');
  res.classList.remove('hidden');

  const failures = [];

  // ---------- 1) Uitsluitingsgronden ----------
  const blocks = schema.decision_logic.exclusion_gate.blocking_questions;
  blocks.forEach(id=>{
    if(valToBool(answers[id]) === true){
      const q = order.find(x => x.id === id);
      failures.push({
        id,
        label: q.text,
        basis: q.legal_basis || "art. 6 VCRO",
        message: q.fail_message || "Deze uitsluitingsgrond verhindert toepassing van het meldingsbesluit."
      });
    }
  });

  if(failures.length){
    showFailures(res, failures, "Geen melding mogelijk (uitsluitingsgronden)");
    return;
  }

  // ---------- 2) Route regels ----------
  const route = answers.CAT_01;
  const rule = schema.decision_logic.route_rules.find(r=>r.route===route);

  if(!rule){
    res.innerHTML = "⚠ Geen route-logica gevonden.";
    return;
  }

  // 2A — verplichte booleans die true moeten zijn
  (rule.required_true || []).forEach(qid=>{
    const v = valToBool(answers[qid]);
    if(v !== true){
      const q = order.find(x => x.id === qid);
      if(q){ failures.push({
        id: qid,
        label: q.text,
        basis: q.legal_basis || "(geen basis in schema)",
        message: q.fail_message || "Voorwaarde moet JA zijn."
      }); }
    }
  });

  // 2B — numerieke regels
  (rule.required_numeric || []).forEach(n=>{
    if(answers[n.id] === undefined) return;
    const val = Number(answers[n.id]);

    let bad = false;
    if(n.rule === "max" && !(val <= n.value)) bad = true;
    if(n.rule === "min" && !(val >= n.value)) bad = true;
    if(n.rule === "exclusiveMax" && !(val < n.value)) bad = true;

    if(bad){
      const q = order.find(x => x.id === n.id);
      failures.push({
        id: n.id,
        label: q.text,
        basis: q.legal_basis || "(geen basis in schema)",
        message: q.fail_message || `Waarde ${val} voldoet niet aan '${n.rule} ${n.value}'.`
      });
    }
  });

  // ---------- UITKOMST ----------
  if(failures.length){
    showFailures(res, failures, "Geen melding mogelijk (voorwaarden niet gehaald)");
    return;
  }

  // ---------- SUCCES ----------
  res.style.background='#dcfce7';
  res.style.border='1px solid #4ade80';
  res.innerHTML = `
    ✅ <strong>Melding lijkt mogelijk</strong> volgens route <strong>${route}</strong>.<br>
    Onder voorbehoud van lokale voorschriften en volledigheidscontrole.
  `;
}
