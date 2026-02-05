function evaluate(){
  const res = document.getElementById('result');
  res.classList.remove('hidden');
  res.style.background = "";
  res.style.border = "";

  const failures = [];

  /* ---------------------------------
     1) Uitsluitingsgronden (art. 6)
     --------------------------------- */
  const blocks = schema.decision_logic.exclusion_gate.blocking_questions;

  blocks.forEach(id => {
    if (valToBool(answers[id]) === true) {
      const q = order.find(x => x.id === id);
      failures.push({
        id,
        label: q.text,
        basis: q.legal_basis || "Artikel 6 VCRO",
        message: q.fail_message || "Deze uitsluitingsgrond verhindert toepassing van het meldingsbesluit."
      });
    }
  });

  if (failures.length) {
    return showFailures(res, failures, "Geen melding mogelijk (uitsluitingsgronden)");
  }

  /* ---------------------------------
     2) Route‑regels
     --------------------------------- */
  const route = answers.CAT_01;
  const rule = schema.decision_logic.route_rules.find(r => r.route === route);

  if (!rule) {
    res.style.background = "#fff7dd";
    res.style.border = "1px solid orange";
    res.innerHTML = "⚠ Geen route-logica gevonden.";
    return;
  }

  // 2A – verplichte booleans
  (rule.required_true || []).forEach(qid => {
    const v = valToBool(answers[qid]);
    if (v !== true) {
      const q = order.find(x => x.id === qid);
      if (q) {
        failures.push({
          id: qid,
          label: q.text,
          basis: q.legal_basis || "(geen basis in schema)",
          message: q.fail_message || "Deze voorwaarde moet 'ja' zijn."
        });
      }
    }
  });

  // 2B — numerieke validaties
  (rule.required_numeric || []).forEach(n => {
    if (answers[n.id] === undefined) return; // vraag niet gesteld → niet valideren
    const val = Number(answers[n.id]);
    let bad = false;

    if (n.rule === "max" && !(val <= n.value)) bad = true;
    if (n.rule === "min" && !(val >= n.value)) bad = true;
    if (n.rule === "exclusiveMax" && !(val < n.value)) bad = true;

    if (bad) {
      const q = order.find(x => x.id === n.id);
      failures.push({
        id: n.id,
        label: q.text,
        basis: q.legal_basis || "(geen basis in schema)",
        message: q.fail_message || `Waarde ${val} voldoet niet aan '${n.rule} ${n.value}'.`
      });
    }
  });

  /* ---------------------------------
     3) FAIL?
     --------------------------------- */
  if (failures.length) {
    return showFailures(res, failures, "Geen melding mogelijk (voorwaarden niet gehaald)");
  }

  /* ---------------------------------
     4) SUCCES
     --------------------------------- */
  res.style.background = "#dcfce7";
  res.style.border = "1px solid #4ade80";

  res.innerHTML = `
    ✅ <strong>Melding lijkt mogelijk</strong> volgens route <strong>${route}</strong>.<br>
    Onder voorbehoud van lokale voorschriften en volledigheidscontrole.<br><br>
    <button onclick="showReportText()">Genereer verslagtekst</button>
  `;
}



/* ============================
   FAILURE OVERLAY GENERATOR
   ============================ */
function showFailures(res, failures, title){
  res.style.background = '#fee2e2';
  res.style.border = '1px solid #ef4444';

  let html = `
    ❌ <strong>${title}</strong><br><br>
  `;

  failures.forEach(f => {
    html += `
      <div style="margin-bottom:10px">
        <strong>${f.id}</strong>: ${f.label}<br>
        ➤ <em>${f.message}</em><br>
        <span style="color:#555">(${f.basis})</span>
      </div>
    `;
  });

  html += `
    <br>
    <button onclick="showReportText()">Genereer verslagtekst</button>
  `;

  res.innerHTML = html;
}



/* ============================
   VERSLAGTEKST GENERATOR
   ============================ */
function randomSentences() {
  const sentences = [
    "Dit is een voorbeeldzin die uitsluitend dient ter illustratie van de verslagtekst.",
    "De inhoud van deze zin heeft geen juridische waarde en kan vrij worden aangepast.",
    "De beoordeling is gebaseerd op de ingevoerde gegevens en geldt enkel indicatief.",
    "Voor afwijking of interpretatie van regelgeving wordt steeds het advies van de bevoegde dienst aanbevolen.",
    "Deze tekst is automatisch gegenereerd als sjabloon voor het verslag."
  ];

  const a = sentences[Math.floor(Math.random()*sentences.length)];
  const b = sentences[Math.floor(Math.random()*sentences.length)];

  return `${a} ${b}`;
}

function showReportText() {
  const modal = document.getElementById("report-modal");
  const textarea = document.getElementById("report-text");

  textarea.value = randomSentences();
  modal.classList.remove("hidden");
}


/* ============================
   MODAL KNOPPEN
   ============================ */
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("close-modal");
  const copyBtn  = document.getElementById("copy-btn");

  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById("report-modal").classList.add("hidden");
    };
  }

  if (copyBtn) {
    copyBtn.onclick = () => {
      const txt = document.getElementById("report-text").value;
      navigator.clipboard.writeText(txt);
      copyBtn.innerText = "Gekopieerd!";
      setTimeout(() => copyBtn.innerText = "Kopieer tekst", 1500);
    };
  }
});
