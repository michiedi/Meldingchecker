async function loadSchema() {
  try {
    // Laad schema.json relatief t.o.v. index.html
    const res = await fetch('./schema.json', {
      cache: "no-store"   // Geen caching → altijd laatste versie laden
    });

    if (!res.ok) {
      console.error("Schema loader foutstatus:", res.status);
      throw new Error(`Schema kon niet geladen worden (status ${res.status})`);
    }

    const data = await res.json();

    if (!data || !data.questionnaire || !data.questionnaire.questions) {
      throw new Error("Schema is ongeldig of onvolledig.");
    }

    return data;

  } catch (err) {
    console.error("Fout bij laden schema.json:", err);

    // Vang fout netjes op in UI
    const container = document.getElementById("question-container");
    if (container) {
      container.innerHTML = `
        <div style="background:#fee2e2;border:1px solid #ef4444;padding:20px;border-radius:8px;">
          <strong>⚠ Schema fout:</strong><br>
          ${err.message}<br><br>
          <em>Controleer of schema.json geldig is en op de juiste plaats staat.</em>
        </div>
      `;
    }

    // Return lege fallback zodat de app niet crasht
    return {
      questionnaire: { questions: [] },
      decision_logic: {}
    };
  }
}
