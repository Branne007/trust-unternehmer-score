/**
 * TRUST Unternehmer-Score · Mail-Worker
 *
 * Empfängt POST vom Frontend mit:
 *   { lead: { vorname, name, firma, email, plz, ort },
 *     customerPdf: base64,
 *     coachPdf: base64,
 *     summary: { overall, domStufeName, strongestName, weakestName, percent[], elapsedMin } }
 *
 * Verschickt via Resend:
 *   1. Kunden-Mail mit customerPdf im Anhang
 *   2. Coach-Mail an tb@trust-unternehmer.de mit coachPdf im Anhang + Summary
 *
 * Secrets (via `wrangler secret put`):
 *   - RESEND_API_KEY: Resend API-Key
 *
 * Konfiguration in wrangler.toml (vars):
 *   - COACH_EMAIL: Ziel-E-Mail für Coach-Version (Default: tb@trust-unternehmer.de)
 *   - FROM_ADDRESS: Absender (Default: TRUST Unternehmer <score@trust-unternehmer.de>)
 */

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

    /* ------- Kunden-Mail ------- */
    const customerHtml = buildCustomerMail(lead);
    const customerResult = await sendResend(env.RESEND_API_KEY, {
      from: FROM,
      to: lead.email,
      reply_to: COACH_EMAIL,
      subject: 'Dein TRUST Unternehmer-Score',
      html: customerHtml,
      attachments: [{
        filename: 'TRUST-Unternehmer-Score.pdf',
        content: customerPdf,
      }],
    });

    if (!customerResult.ok) {
      return json({ error: 'Customer mail failed', details: customerResult.error }, 502);
    }

    /* ------- Coach-Mail ------- */
    const coachHtml = buildCoachMail(lead, summary);
    const coachResult = await sendResend(env.RESEND_API_KEY, {
      from: FROM,
      to: COACH_EMAIL,
      reply_to: lead.email,
      subject: `TRUST Score · ${fullName}${lead.firma ? ' · ' + lead.firma : ''} · ${summary?.overall ?? '?'}/100`,
      html: coachHtml,
      attachments: [{
        filename: `TRUST-Score-Coach-${lead.name || 'Kunde'}.pdf`,
        content: coachPdf,
      }],
    });

    if (!coachResult.ok) {
      // Kunde ist raus - Coach nicht. Trotzdem 200 zurück; Frontend zeigt Bestätigung.
      console.error('Coach mail failed:', coachResult.error);
    }

    return json({ ok: true, customerSent: true, coachSent: coachResult.ok });
  },
};

/* ---------- Helpers ---------- */
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
      <div style="font-size:14px;line-height:1.5">Lies dir den Report einmal ganz durch. Notiere dir Stellen, die dich überraschen oder wo du inhaltlich anders siehst als beschrieben. Wenn du magst, sprechen wir in einem 30-minütigen Klarheits-Gespräch über deine Ergebnisse und den passenden nächsten Schritt.</div>
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
      <div style="font-size:14px;line-height:1.5">Coach-PDF enthält Coach-Hinweise pro Stufe (Fokus / Formatvorschlag / Warnhinweis), alle 40 Antworten mit Werten, sowie die versteckte Metadaten-Zeile am Ende für den Kompass-Import.</div>
    </div>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}
