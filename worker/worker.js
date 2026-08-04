/**
 * TRUST Unternehmer-Score · Mail- und Encharge-Worker · v2.1
 *
 * Empfängt POST vom Frontend mit:
 *   { lead: { vorname, name, firma, email, plz, ort,
 *             rolle, mitarbeiter, betriebsart, zielgruppe, region, consentAt },
 *     customerPdf: base64,
 *     coachPdf: base64,
 *     summary: { overall, domStufeName, strongestName, weakestName, percent[], elapsedMin } }
 *
 * Tut drei Dinge, in dieser Reihenfolge:
 *   1. Kunden-Mail mit customerPdf im Anhang
 *   2. Coach-Mail an tb@trust-unternehmer.de mit coachPdf + Summary
 *   3. Kontakt an Encharge (REST API)
 *
 * Schritt 3 darf scheitern, ohne dass der Nutzer etwas merkt — die Mails sind
 * dann schon raus. Der Fehler landet im Worker-Log und in der Antwort.
 *
 * NEU in v2.1
 *   - Encharge-Anbindung über die REST API statt der Ingest API: letztere
 *     ist nur im Premium-Tarif freigeschaltet und antwortet sonst mit 403.
 *   - Zuordnungstabelle FELD ganz oben: weicht ein API-Name in Encharge ab,
 *     wird nur dort eine Zeile geändert
 *   - Der Worker schreibt Tatsachen, keine Stage. Stage-Übergänge gehören in
 *     einen Encharge-Flow, der den aktuellen Stand prüft (sonst würde ein
 *     zweiter Score-Durchlauf einen Kontakt von Stage 4 auf 2 zurückstufen).
 *
 * Secrets (via `wrangler secret put`):
 *   - RESEND_API_KEY     Resend API-Key
 *   - ENCHARGE_API_KEY   API Key aus app.encharge.io/account/info
 *                       (der untere der beiden – NICHT der Write Key)
 *
 * Konfiguration in wrangler.toml (vars):
 *   - COACH_EMAIL   Ziel-E-Mail für Coach-Version
 *   - FROM_ADDRESS  Absender
 */

/* ============================================================
   ZUORDNUNG DER ENCHARGE-FELDER
   Links steht der Name, den der Worker verwendet, rechts der
   API-Name des Feldes in Encharge. Weicht dort etwas ab:
   nur die rechte Seite ändern, sonst nichts.
   ============================================================ */
const FELD = {
  /* Standardfelder von Encharge */
  vorname:       'firstName',
  nachname:      'lastName',
  vollname:      'name',
  firma:         'company',
  plz:           'postcode',
  ort:           'city',

  /* Eigene Felder – vorher in Encharge anlegen */
  mitarbeitende: 'mitarbeitende',
  rolle:         'rolle',
  betriebsart:   'betriebsart',
  eigentum:      'eigentum',
  ring:          'ring',
  einzugsgebiet: 'einzugsgebiet',
  scoreWert:     'scorewert',   /* kleines w — so von Encharge vergeben */
  scoreStufe:    'scoreStufe',
  scoreStaerke:  'scoreStaerke',
  scoreHebel:    'scoreHebel',
  scoreDatum:    'scoreDatum',
  einwilligung:  'einwilligungAm',
  aktivierung:   'letzteAktivierung'
};

/* Tag, das jeder Score-Kontakt bekommt. Bewusst KEIN Double-Opt-in:
   die Einwilligung im Score deckt Auswertung und Klarheits-Gespräch,
   nicht den Newsletter. */
const SCORE_TAG = 'Score gemacht';

/* REST API, nicht Ingest API. Die Ingest API ist nur im Premium-Tarif
   freigeschaltet (403), die REST API ist im Bestandstarif enthalten.
   Authentifizierung mit dem API Key, NICHT mit dem Write Key.
   Die Personendaten stehen direkt auf oberster Ebene, ohne Umschlag. */
const ENCHARGE_URL = 'https://api.encharge.io/v1/people';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { lead, customerPdf, coachPdf, summary } = body || {};
    if (!lead || !lead.email || !customerPdf || !coachPdf) {
      return json({ error: 'Missing required fields (lead, customerPdf, coachPdf)' }, 400);
    }

    const FROM = env.FROM_ADDRESS || 'TRUST Unternehmer <score@trust-unternehmer.de>';
    const COACH_EMAIL = env.COACH_EMAIL || 'tb@trust-unternehmer.de';

    if (!env.RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY missing in worker env' }, 500);
    }

    const fullName = `${lead.vorname} ${lead.name}`.trim();

    /* ------- 1 · Kunden-Mail ------- */
    const customerResult = await sendResend(env.RESEND_API_KEY, {
      from: FROM,
      to: lead.email,
      reply_to: COACH_EMAIL,
      subject: 'Dein TRUST Unternehmer-Score',
      html: buildCustomerMail(lead),
      attachments: [{
        filename: 'TRUST-Unternehmer-Score.pdf',
        content: customerPdf,
      }],
    });

    if (!customerResult.ok) {
      return json({ error: 'Customer mail failed', details: customerResult.error }, 502);
    }

    /* ------- 2 · Coach-Mail ------- */
    const coachResult = await sendResend(env.RESEND_API_KEY, {
      from: FROM,
      to: COACH_EMAIL,
      reply_to: lead.email,
      subject: `TRUST Score · ${zgKuerzel(lead.zielgruppe)} · ${fullName}${lead.firma ? ' · ' + lead.firma : ''} · ${summary?.overall ?? '?'}/100`,
      html: buildCoachMail(lead, summary),
      attachments: [{
        filename: `TRUST-Score-Coach-${lead.name || 'Kunde'}.pdf`,
        content: coachPdf,
      }],
    });

    if (!coachResult.ok) {
      // Kunde ist raus - Coach nicht. Trotzdem 200 zurück; Frontend zeigt Bestätigung.
      console.error('Coach mail failed:', coachResult.error);
    }

    /* ------- 3 · Encharge ------- */
    const enchargeResult = await sendEncharge(env.ENCHARGE_API_KEY, lead, summary);
    if (!enchargeResult.ok) {
      console.error('Encharge failed:', enchargeResult.error);
    }

    return json({
      ok: true,
      customerSent: true,
      coachSent: coachResult.ok,
      enchargeSent: enchargeResult.ok,
    });
  },
};

/* ============================================================
   ENCHARGE · Ingest API
   ============================================================ */

/**
 * Schreibt den Kontakt über die Encharge REST API.
 *
 * Bewusst NICHT geschrieben werden trustStage und erstAktivierung:
 * beide dürfen nur unter Bedingungen gesetzt werden (Stage nur nach oben,
 * Erstaktivierung nur wenn leer). Das gehört in einen Encharge-Flow, der
 * durch das Tag bzw. eine Feldänderung ausgelöst wird.
 *
 * Achtung: Encharge legt unbekannte Feldnamen still als neues Custom Field
 * an, statt einen Fehler zu melden. Ein Tippfehler in FELD fällt deshalb
 * nicht auf. Nach jeder Änderung an FELD einmal in Settings → Custom Fields
 * nachsehen, ob dort etwas Unerwartetes aufgetaucht ist.
 */
async function sendEncharge(apiKey, lead, summary) {
  if (!apiKey) {
    return { ok: false, error: 'ENCHARGE_API_KEY fehlt' };
  }

  const s = summary || {};
  const jetzt = new Date().toISOString();

  const person = {
    email: lead.email,
    tags: SCORE_TAG,
  };

  /* Identität und Firma */
  setzen(person, FELD.vorname,  lead.vorname);
  setzen(person, FELD.nachname, lead.name);
  setzen(person, FELD.vollname, `${lead.vorname || ''} ${lead.name || ''}`.trim());
  setzen(person, FELD.firma,    lead.firma);
  setzen(person, FELD.plz,      lead.plz);
  setzen(person, FELD.ort,      lead.ort);

  /* Zielgruppen-Merkmale · stabile Codes aus data.js */
  setzen(person, FELD.mitarbeitende, lead.mitarbeiter);
  setzen(person, FELD.rolle,         lead.rolle);
  setzen(person, FELD.betriebsart,   lead.betriebsart);
  setzen(person, FELD.ring,          lead.zielgruppe);

  /* Abgeleitete Wahrheitswerte. Die Eigentumsfrage folgt derselben Regel
     wie classifyZielgruppe() im Frontend – wird sie dort geändert, hier
     nachziehen. */
  person[FELD.eigentum] =
    lead.rolle === 'inhaber' || lead.rolle === 'nachfolger_beteiligt';
  person[FELD.einzugsgebiet] = lead.region === true;

  /* Score-Ergebnis */
  if (typeof s.overall === 'number') person[FELD.scoreWert] = s.overall;
  setzen(person, FELD.scoreStufe,   s.domStufeName);
  setzen(person, FELD.scoreStaerke, s.strongestName);
  setzen(person, FELD.scoreHebel,   s.weakestName);
  person[FELD.scoreDatum]  = jetzt;
  person[FELD.aktivierung] = 'Unternehmer-Score';

  /* Einwilligung mit Zeitstempel aus dem Frontend, sonst jetzt */
  person[FELD.einwilligung] = lead.consentAt || jetzt;

  try {
    const res = await fetch(ENCHARGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Encharge-Token': apiKey,
      },
      body: JSON.stringify(person),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* Setzt ein Feld nur, wenn ein Wert vorhanden ist. Verhindert, dass ein
   vorhandener Wert in Encharge durch einen leeren überschrieben wird. */
function setzen(ziel, feld, wert) {
  if (wert !== undefined && wert !== null && String(wert).trim() !== '') {
    ziel[feld] = wert;
  }
}

/* ============================================================
   HELFER
   ============================================================ */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function sendResend(apiKey, payload) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${err}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ---------- Kunden-Mail HTML ---------- */
function buildCustomerMail(lead) {
  const vorname = escapeHtml(lead.vorname || 'Du');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f7f8fa;font-family:Arial,sans-serif;color:#161616">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,48,91,.08)">
  <tr><td style="background:#00305b;padding:32px;text-align:center">
    <div style="color:#F18423;font-size:12px;font-weight:700;letter-spacing:2px">TRUST UNTERNEHMER</div>
    <div style="color:#fff;font-size:24px;font-weight:700;margin-top:4px">Dein Unternehmer-Score</div>
    <div style="color:rgba(255,255,255,.7);font-size:14px;font-style:italic;margin-top:4px">Reifegrad deiner Unternehmensführung</div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="font-size:16px;margin:0 0 12px">Hallo ${vorname},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      dein persönlicher TRUST Unternehmer-Score ist ausgewertet. Du findest deinen ausführlichen Report als PDF im Anhang dieser Mail.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px">
      Nimm dir am besten 15 Minuten Zeit, ihn in Ruhe durchzugehen. Besonders die drei nächsten Schritte und die Kernaussage sind konkrete Ansatzpunkte für deine Entwicklung in den nächsten 30 Tagen.
    </p>
    <div style="background:#FFF5EB;border-left:4px solid #F18423;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0">
      <div style="font-size:11px;font-weight:700;color:#F18423;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Was jetzt hilft</div>
      <div style="font-size:14px;line-height:1.5">Lies dir den Report einmal ganz durch. Notiere dir Stellen, die dich überraschen oder wo du inhaltlich anders siehst als beschrieben.</div>
    </div>

    <div style="background:#00305b;color:#fff;padding:22px 24px;border-radius:12px;margin:24px 0">
      <div style="font-size:11px;font-weight:700;color:#F18423;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Ein Angebot noch</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:10px">30 Minuten Klarheits-Gespräch – kostenfrei</div>
      <div style="font-size:14px;line-height:1.6;margin-bottom:14px">
        Wir gehen deinen Score gemeinsam durch, sortieren, was dich aktuell am meisten frisst, und arbeiten heraus, wo dein größter Hebel liegt. Am Ende hast du Klarheit – und entscheidest völlig frei, wie du weitergehen möchtest.
      </div>
      <div style="font-size:13px;line-height:1.6;color:rgba(255,255,255,.85);margin-bottom:16px">
        <strong style="color:#fff">Keine Verkaufsschleife, kein Nachfassen ohne dein OK.</strong>
      </div>
      <div style="background:#F18423;padding:12px 18px;border-radius:8px;display:inline-block">
        <a href="https://sprint.trust-unternehmer.de/#gespraech" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px">Gespräch anfragen →</a>
      </div>
      <div style="font-size:12px;line-height:1.5;color:rgba(255,255,255,.75);margin-top:12px">
        Ein kurzes Formular, vier Klicks. Ich melde mich innerhalb von 24 Stunden mit zwei Terminvorschlägen.
      </div>
    </div>

    <p style="font-size:15px;line-height:1.6;margin:20px 0 0">
      Bei Rückfragen erreichst du mich jederzeit unter <a href="mailto:tb@trust-unternehmer.de" style="color:#F18423">tb@trust-unternehmer.de</a> oder telefonisch unter 0151 2525 4853.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:20px 0 0">
      Viele Grüße<br>
      <strong>Thomas Brandenburger</strong>
    </p>
  </td></tr>
  <tr><td style="background:#082742;padding:24px 32px;text-align:center;color:rgba(255,255,255,.6);font-size:11px">
    <strong style="color:#fff">Thomas Brandenburger</strong> · TB UnternehmerImpulse eG<br>
    Am Zwingel 2 · 35683 Dillenburg<br>
    <a href="https://trust-unternehmer.de" style="color:#F18423;text-decoration:none">trust-unternehmer.de</a>
  </td></tr>
</table>
</body></html>`;
}

/* ---------- Coach-Mail HTML ---------- */
function buildCoachMail(lead, summary) {
  const s = summary || {};
  const percentList = Array.isArray(s.percent)
    ? s.percent.map((p, i) => `Stufe ${i + 1}: ${p}%`).join(' · ')
    : '–';
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f7f8fa;font-family:Arial,sans-serif;color:#161616">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,48,91,.08)">
  <tr><td style="background:#00305b;padding:24px 32px">
    <div style="color:#F18423;font-size:11px;font-weight:700;letter-spacing:2px">TRUST · NEUER SCORE-EINGANG</div>
    <div style="color:#fff;font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(lead.vorname)} ${escapeHtml(lead.name)}</div>
    <div style="color:rgba(255,255,255,.75);font-size:14px;margin-top:2px">${lead.firma ? escapeHtml(lead.firma) : ''}${(lead.plz || lead.ort) ? ' · ' + escapeHtml((lead.plz || '') + ' ' + (lead.ort || '')) : ''}</div>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="font-size:15px;margin:0 0 16px">Ein neuer Score-Durchlauf ist eingegangen. Coach-PDF im Anhang – mit Rohdaten, Coach-Hinweisen und der maschinenlesbaren Metadaten-Zeile für den Klarheits-Kompass.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px;width:160px">Kontakt</td>
          <td style="padding:6px 0;font-size:13px"><a href="mailto:${escapeHtml(lead.email)}" style="color:#00305b">${escapeHtml(lead.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Ring</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:${zgFarbe(lead.zielgruppe)}">${escapeHtml(s.zielgruppeLabel || zgKuerzel(lead.zielgruppe))}${lead.region === false ? ' · außerhalb des Einzugsgebiets' : ''}</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Rolle / Größe / Betrieb</td>
          <td style="padding:6px 0;font-size:13px">${escapeHtml(lead.rolle || '–')} · ${escapeHtml(lead.mitarbeiter || '–')} · ${escapeHtml(lead.betriebsart || '–')}</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Gesamtscore</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700;color:#F18423">${s.overall ?? '–'} / 100</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Dominante Stufe</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700">${escapeHtml(s.domStufeName || '–')}</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Stärkste Stufe</td>
          <td style="padding:6px 0;font-size:13px">${escapeHtml(s.strongestName || '–')}</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Größter Hebel</td>
          <td style="padding:6px 0;font-size:13px;color:#00305b;font-weight:700">${escapeHtml(s.weakestName || '–')}</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Verteilung</td>
          <td style="padding:6px 0;font-size:12px;color:#54595F">${escapeHtml(percentList)}</td></tr>
      <tr><td style="padding:6px 0;color:#54595F;font-size:13px">Bearbeitungszeit</td>
          <td style="padding:6px 0;font-size:13px">${s.elapsedMin ?? '–'} Min</td></tr>
    </table>

    <div style="background:#FFF5EB;border-left:4px solid #F18423;padding:14px 18px;border-radius:0 8px 8px 0;margin:18px 0">
      <div style="font-size:11px;font-weight:700;color:#F18423;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Nächster Schritt</div>
      <div style="font-size:14px;line-height:1.5">Kontakt steht in Encharge mit Ring, Firmografie und Score-Werten. Bei Ring „kern" innerhalb von 48 Stunden persönlich melden. Coach-PDF enthält alle 40 Antworten und die Metadaten-Zeile für den Kompass-Import.</div>
    </div>
  </td></tr>
</table>
</body></html>`;
}

/* Kurzbezeichnung und Farbe des Zielgruppen-Rings für die Coach-Mail */
function zgKuerzel(status) {
  return ({
    kern: 'KERN',
    kern_einzelfall: 'KERN?',
    peer: 'PEER',
    suchfeld: 'SUCHFELD',
  })[status] || 'OHNE ANGABE';
}

function zgFarbe(status) {
  return ({
    kern: '#27AE60',
    kern_einzelfall: '#D4A017',
    peer: '#00305b',
    suchfeld: '#54595F',
  })[status] || '#54595F';
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
