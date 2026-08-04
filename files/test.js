/* ============================================================
   TRUST Unternehmer-Score · Test-Logik (v2.1)
   Berechnung, Lead-Handling, Versand-Flow
   Neu: Consent-Checkbox-Validierung
   ============================================================ */

/* ---------- State ---------- */
const state = {
  answers: new Array(QUESTIONS.length).fill(null),
  currentQ: 0,
  lead: null,
  startedAt: null,
};

/* ---------- Persistenz (24h Wiederaufnahme) ---------- */
const STORAGE_KEY = 'trust-score-v11';
const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers: state.answers,
      currentQ: state.currentQ,
      lead: state.lead,
      startedAt: state.startedAt,
      savedAt: Date.now(),
    }));
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.savedAt || Date.now() - data.savedAt > STORAGE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function clearSavedState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/* ---------- Screen-Switching ---------- */
function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Init & Start ---------- */
function initStart() {
  const saved = loadState();
  const resumeModal = document.getElementById('resume-modal');
  if (saved && saved.answers && saved.answers.some(a => a !== null) && resumeModal) {
    const progress = Math.round(saved.answers.filter(a => a !== null).length / QUESTIONS.length * 100);
    document.getElementById('resume-progress').textContent = progress + '%';
    resumeModal.style.display = 'flex';
  }
}

function resumeSaved() {
  const saved = loadState();
  if (!saved) return;
  state.answers = saved.answers || new Array(QUESTIONS.length).fill(null);
  state.currentQ = saved.currentQ || 0;
  state.lead = saved.lead || null;
  state.startedAt = saved.startedAt || Date.now();
  closeResumeModal();
  startTest(true);
}

function discardSaved() {
  clearSavedState();
  closeResumeModal();
}

function closeResumeModal() {
  const m = document.getElementById('resume-modal');
  if (m) m.style.display = 'none';
}

function startTest(isResume) {
  if (!isResume) {
    state.answers = new Array(QUESTIONS.length).fill(null);
    state.currentQ = 0;
    state.startedAt = Date.now();
  }
  switchScreen('screen-quiz');
  renderQuestion();
}

/* ---------- Fragen rendern ---------- */
function renderQuestion() {
  const q = QUESTIONS[state.currentQ];
  const total = QUESTIONS.length;
  const cur = state.currentQ + 1;
  const stufeName = STUFEN[q.ci];

  const label = document.getElementById('progress-label');
  if (label) label.textContent = 'Frage ' + cur + ' von ' + total + ' · Stufe ' + (q.ci + 1) + ': ' + stufeName;
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.width = ((cur - 1) / total * 100) + '%';

  const area = document.getElementById('question-area');
  if (!area) return;
  let html = '<div class="question-card">' +
             '<span class="cluster-label">Stufe ' + (q.ci + 1) + ': ' + stufeName + '</span>' +
             '<h3>' + q.text + '</h3>' +
             '<div class="likert-group">';
  LIKERT.forEach(opt => {
    const selected = state.answers[state.currentQ] === opt.val;
    html += '<button type="button" class="likert-btn chip-' + opt.val + (selected ? ' selected' : '') + '" ' +
            'onclick="setAnswer(' + opt.val + ')">' +
            '<span class="badge">' + opt.badge + '</span>' + opt.label + '</button>';
  });
  html += '</div></div>';
  area.innerHTML = html;

  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.disabled = state.currentQ === 0;
  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) {
    nextBtn.textContent = (state.currentQ === total - 1) ? 'Auswertung starten →' : 'Weiter →';
    nextBtn.disabled = state.answers[state.currentQ] === null;
  }
}

function setAnswer(val) {
  state.answers[state.currentQ] = val;
  saveState();
  renderQuestion();
  setTimeout(() => {
    if (state.answers[state.currentQ] !== null) nextQuestion();
  }, 250);
}

function nextQuestion() {
  if (state.answers[state.currentQ] === null) return;
  if (state.currentQ < QUESTIONS.length - 1) {
    state.currentQ++;
    saveState();
    renderQuestion();
  } else {
    gateToLead();
  }
}

function prevQuestion() {
  if (state.currentQ > 0) {
    state.currentQ--;
    saveState();
    renderQuestion();
  }
}

/* ---------- Berechnung ---------- */
function computeScores() {
  const sum = [0, 0, 0, 0, 0];
  const count = [0, 0, 0, 0, 0];
  QUESTIONS.forEach((q, i) => {
    let v = state.answers[i];
    if (v === null || v === undefined || isNaN(v)) v = 0;
    v = Number(v);
    if (q.inv) v = 4 - v;
    sum[q.ci] += v;
    count[q.ci]++;
  });
  const percent = sum.map((s, i) => {
    if (!count[i]) return 0;
    const r = Math.round(s / (count[i] * 4) * 100);
    return isNaN(r) ? 0 : Math.max(0, Math.min(100, r));
  });
  const totalWeight = GEWICHTUNG.reduce((a, b) => a + b, 0);
  const rawOverall = percent.reduce((s, v, i) => s + v * GEWICHTUNG[i], 0) / totalWeight;
  const overall = isNaN(rawOverall) ? 0 : Math.round(rawOverall);

  let dom = 0, strongest = 0, weakest = 0;
  for (let i = 1; i < 5; i++) {
    if (percent[i] >= percent[dom]) dom = i;
    if (percent[i] > percent[strongest]) strongest = i;
    if (percent[i] < percent[weakest]) weakest = i;
  }

  const elapsedMin = state.startedAt ? Math.max(0.1, (Date.now() - state.startedAt) / 60000) : null;

  return {
    percent, overall, dom, strongest, weakest, elapsedMin,
  };
}

/* ---------- Zielgruppen-Einordnung ----------
   Rein interne Klassifikation nach Zielgruppen-Definition v1.
   Wird dem Nutzer nicht angezeigt, sondern nur im Coach-PDF und in der
   Coach-Mail ausgewiesen und später an Encharge übergeben. */
function classifyZielgruppe(lead) {
  const eigentum   = lead.rolle === 'inhaber' || lead.rolle === 'nachfolger_beteiligt';
  const betriebOk  = lead.betriebsart === 'fertigung';
  const groesseKern = lead.mitarbeiter === '15_30' || lead.mitarbeiter === '31_60';
  const groesseRand = lead.mitarbeiter === '61_100';
  const grossfirma  = lead.mitarbeiter === 'ueber100';
  const fuehrend    = eigentum || lead.rolle === 'gf_ohne_beteiligung';

  let status = 'suchfeld';
  if (eigentum && betriebOk && groesseKern)      status = 'kern';
  else if (eigentum && betriebOk && groesseRand) status = 'kern_einzelfall';
  else if (fuehrend && grossfirma)               status = 'peer';

  const plz = String(lead.plz || '').replace(/\D/g, '');
  const region = REGION_PLZ.some(pre => plz.indexOf(pre) === 0);

  const gruende = [];
  if (!eigentum)  gruende.push('kein Eigentum');
  if (!betriebOk) gruende.push('keine eigene Wertschöpfung');
  if (lead.mitarbeiter === 'bis14') gruende.push('unter 15 Mitarbeitende');
  if (grossfirma) gruende.push('über 100 Mitarbeitende');
  if (!region)    gruende.push('außerhalb des Einzugsgebiets');

  return {
    status: status,
    label: ZIELGRUPPEN_LABEL[status],
    region: region,
    abweichungen: gruende,
  };
}

/* ---------- Auswahlfelder befüllen ---------- */
function fillSelect(id, options) {
  const el = document.getElementById(id);
  if (!el || el.options.length) return;
  el.innerHTML = options.map(o =>
    '<option value="' + o.val + '"' + (o.val ? '' : ' disabled selected') + '>' + o.label + '</option>'
  ).join('');
}

function fillLeadSelects() {
  fillSelect('lead-rolle', ROLLEN);
  fillSelect('lead-mitarbeiter', MITARBEITER);
  fillSelect('lead-betriebsart', BETRIEBSARTEN);
}

/* ---------- Lead-Gate ---------- */
function gateToLead() {
  saveState();
  switchScreen('screen-lead');
  const scores = computeScores();
  const teaserNum = document.getElementById('teaser-num');
  const teaserStage = document.getElementById('teaser-stage');
  const teaserArc = document.getElementById('teaser-arc');
  if (teaserNum) teaserNum.textContent = scores.overall;
  if (teaserStage) teaserStage.textContent = 'Deine stärkste Stufe: ' + STUFEN[scores.strongest];
  if (teaserArc) {
    const c = 534.07;
    teaserArc.style.strokeDashoffset = c - c * scores.overall / 100;
  }
  fillLeadSelects();
  updateConsent();
}

/* ---------- Consent-Handling ----------
   Der Absende-Button wird disabled bis die Consent-Checkbox angehakt ist. */
function updateConsent() {
  const cb = document.getElementById('lead-consent');
  const btn = document.getElementById('btn-submit-lead');
  if (!cb || !btn) return;
  btn.disabled = !cb.checked;
  btn.style.opacity = cb.checked ? '1' : '0.5';
  btn.style.cursor = cb.checked ? 'pointer' : 'not-allowed';
}

/* ---------- Lead-Formular absenden ---------- */
function submitLead() {
  const consentBox = document.getElementById('lead-consent');
  if (!consentBox || !consentBox.checked) {
    alert('Bitte bestätige die Einwilligung, damit dein Score-Report an dich versendet werden kann.');
    return;
  }

  const fields = ['lead-vorname', 'lead-name', 'lead-firma', 'lead-email', 'lead-plz', 'lead-ort',
                  'lead-rolle', 'lead-mitarbeiter', 'lead-betriebsart'];
  let ok = true;
  fields.forEach(id => {
    const e = document.getElementById(id);
    if (!e) return;
    if (!e.value.trim()) { e.style.borderColor = '#c0392b'; ok = false; }
    else e.style.borderColor = '';
  });
  const em = document.getElementById('lead-email');
  if (em && em.value && !em.value.includes('@')) { em.style.borderColor = '#c0392b'; ok = false; }
  if (!ok) return;

  state.lead = {
    vorname: document.getElementById('lead-vorname').value.trim(),
    name: document.getElementById('lead-name').value.trim(),
    firma: document.getElementById('lead-firma').value.trim(),
    email: document.getElementById('lead-email').value.trim(),
    plz: document.getElementById('lead-plz').value.trim(),
    ort: document.getElementById('lead-ort').value.trim(),
    /* Firmografische Filterfelder - stabile Codes, siehe data.js */
    rolle: document.getElementById('lead-rolle').value,
    mitarbeiter: document.getElementById('lead-mitarbeiter').value,
    betriebsart: document.getElementById('lead-betriebsart').value,
    consentAt: new Date().toISOString(),  // Zeitstempel für die Einwilligung
  };
  /* Interne Einordnung ergaenzen - nie im Kunden-PDF, nie in der Kunden-Mail */
  const zg = classifyZielgruppe(state.lead);
  state.lead.zielgruppe = zg.status;
  state.lead.region = zg.region;
  saveState();
  showProcessing();
}

/* ---------- Verarbeitung: PDFs erzeugen und versenden ---------- */
async function showProcessing() {
  switchScreen('screen-processing');
  const scores = computeScores();

  try {
    const customerPdf = await generateCustomerPdf(scores, state.lead);
    const coachPdf = await generateCoachPdf(scores, state.lead, state.answers);

    const workerUrl = window.SCORE_CONFIG?.workerUrl || '';
    let mailSent = false;

    if (workerUrl) {
      try {
        const res = await fetch(workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead: state.lead,
            customerPdf,
            coachPdf,
            summary: {
              zielgruppe: state.lead.zielgruppe,
              zielgruppeLabel: ZIELGRUPPEN_LABEL[state.lead.zielgruppe],
              region: state.lead.region,
              overall: scores.overall,
              domStufeName: STUFEN[scores.dom],
              strongestName: STUFEN[scores.strongest],
              weakestName: STUFEN[scores.weakest],
              percent: scores.percent,
              elapsedMin: scores.elapsedMin ? Math.round(scores.elapsedMin * 10) / 10 : null,
            },
          }),
        });
        if (!res.ok) throw new Error('Backend HTTP ' + res.status);
        mailSent = true;
      } catch (err) {
        console.error('Mail-Versand fehlgeschlagen:', err);
        window.__scoreDownloadFallback = { customerPdf, coachPdf };
      }
    } else {
      window.__scoreDownloadFallback = { customerPdf, coachPdf };
    }

    clearSavedState();
    showResults(scores, mailSent);
  } catch (err) {
    console.error('PDF-Fehler:', err);
    const msg = document.getElementById('processing-msg');
    if (msg) msg.innerHTML = 'Bei der Auswertung ist ein Fehler aufgetreten. Bitte lade die Seite neu oder wende dich an <a href="mailto:tb@trust-unternehmer.de">tb@trust-unternehmer.de</a>.';
  }
}

/* ---------- Ergebnis-Ansicht ---------- */
function showResults(scores, mailSent) {
  switchScreen('screen-result');

  const banner = document.getElementById('confirm-banner');
  const fallback = document.getElementById('fallback-download');
  if (mailSent) {
    if (banner) {
      banner.style.display = 'block';
      const em = document.getElementById('confirm-email');
      if (em) em.textContent = state.lead.email;
    }
    if (fallback) fallback.style.display = 'none';
  } else {
    if (banner) banner.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
  }

  const num = document.getElementById('result-num');
  if (num) num.textContent = scores.overall;
  const arc = document.getElementById('result-arc');
  if (arc) {
    const c = 534.07;
    arc.style.strokeDashoffset = c - c * scores.overall / 100;
  }
  const stage = document.getElementById('result-stage');
  if (stage) stage.textContent = 'Deine stärkste Stufe: ' + STUFEN[scores.strongest];

  const barContainer = document.getElementById('stufen-bars');
  if (barContainer) {
    barContainer.innerHTML = scores.percent.map((p, i) => {
      const isDom = i === scores.dom;
      return '<div class="stufe-row">' +
        '<div class="stufe-label">Stufe ' + (i + 1) + ': ' + STUFEN[i] + (isDom ? ' <span class="tag-dom">dominant</span>' : '') + '</div>' +
        '<div class="stufe-bar-bg"><div class="stufe-bar-fill" style="width:' + p + '%;background:' + STUFEN_FARBEN[i] + '"></div></div>' +
        '<div class="stufe-pct">' + p + '%</div>' +
      '</div>';
    }).join('');
  }

  const rec = document.getElementById('result-kernaussage');
  if (rec) rec.textContent = STUFEN_KERNAUSSAGE[scores.dom].lang;
  const hebel = document.getElementById('result-hebel');
  if (hebel) hebel.textContent = STUFEN_KERNAUSSAGE[scores.dom].hebel;

  const steps = document.getElementById('result-steps');
  if (steps) {
    steps.innerHTML = STUFEN_SCHRITTE[scores.dom].map((s, i) =>
      '<div class="step-row"><div class="step-num">' + (i + 1) + '</div><div class="step-text">' + s + '</div></div>'
    ).join('');
  }

  renderCta();
}

/* ---------- Abschluss der Ergebnisseite ----------
   Der Abschluss richtet sich nach dem Ring aus classifyZielgruppe().
   Kern, Kern-Einzelfall und Peer bekommen den Weg ins Klarheits-Gespräch
   ueber das Anfrageformular der Sprint-Seite. Suchfeld bekommt den
   KI-Talk als niederschwelligen Einstieg – dort ist die Teilnahme
   bewusst breiter angelegt.

   Der Ring wird dem Nutzer NIE genannt. Er steuert nur, was angeboten
   wird, nicht was zu lesen ist. */
function renderCta() {
  const ziel = document.getElementById('result-cta');
  if (!ziel) return;

  const ring = (state.lead && state.lead.zielgruppe) || '';
  const naheDran = ring === 'kern' || ring === 'kern_einzelfall' || ring === 'peer';

  if (naheDran) {
    ziel.innerHTML =
      '<div class="cta-section">' +
        '<h3>Bereit für ein persönliches Klarheits-Gespräch?</h3>' +
        '<p>30 Minuten, online, kostenfrei. Wir gehen deinen Score gemeinsam durch, ' +
        'sortieren, was dich aktuell am meisten frisst, und arbeiten heraus, wo dein ' +
        'größter Hebel liegt. Eine Absage ist dabei ein legitimes Ergebnis.</p>' +
        '<a href="https://sprint.trust-unternehmer.de/#gespraech" class="btn btn-primary btn-large">' +
        'Gespräch anfragen →</a>' +
      '</div>' +
      '<div class="card" style="background:var(--color-bg)">' +
        '<span class="eyebrow">Wenn du weiter gehen willst</span>' +
        '<h4 style="color:var(--color-navy);margin-top:0">Der TRUST Strategie-Sprint</h4>' +
        '<p>Vier Wochen, neun Module, rund 15 Stunden deiner Zeit. Am Ende steht deine ' +
        'Strategie auf einer Seite – geprüft nicht vom Berater, sondern von deinen eigenen Kunden.</p>' +
        '<a href="https://sprint.trust-unternehmer.de" target="_blank" ' +
        'style="color:var(--color-orange);font-weight:700">Zum Strategie-Sprint →</a>' +
      '</div>';
  } else {
    ziel.innerHTML =
      '<div class="cta-section">' +
        '<h3>Der nächste Schritt, ohne Verpflichtung</h3>' +
        '<p>Einmal im Monat, freitags von 8:30 bis 9:30 Uhr, spreche ich im TRUST KI-Talk ' +
        'über konkrete Anwendungsfälle aus dem Unternehmeralltag. Online, kostenfrei, ' +
        'ohne Anmeldeverpflichtung.</p>' +
        '<a href="https://ki-talk.trust-unternehmer.de" class="btn btn-primary btn-large">' +
        'Zum KI-Talk →</a>' +
      '</div>' +
      '<div class="card" style="background:var(--color-bg)">' +
        '<span class="eyebrow">Oder direkt</span>' +
        '<h4 style="color:var(--color-navy);margin-top:0">Ein kurzes Gespräch</h4>' +
        '<p>Wenn du deinen Score lieber persönlich besprechen möchtest: Schreib mir zwei Zeilen, ' +
        'ich melde mich innerhalb von 24 Stunden.</p>' +
        '<a href="mailto:tb@trust-unternehmer.de?subject=Frage%20zu%20meinem%20TRUST%20Unternehmer-Score" ' +
        'style="color:var(--color-orange);font-weight:700">tb@trust-unternehmer.de →</a>' +
      '</div>';
  }
}

/* ---------- Fallback-Download ---------- */
function downloadFallback(kind) {
  const src = window.__scoreDownloadFallback;
  if (!src) return;
  const b64 = kind === 'coach' ? src.coachPdf : src.customerPdf;
  const filename = kind === 'coach' ? 'TRUST-Score-Coach.pdf' : 'TRUST-Unternehmer-Score.pdf';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
