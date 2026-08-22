/* ============================================================
   TRUST Unternehmer-Score · PDF-Generierung (v2.1)
   Client-seitige Erzeugung mit pdfmake (Kunde + Coach)

   Fixes gegenüber v2.0:
   - Ligatur-Bug in Roboto (fi/fl) durch Zero-Width-Space behoben
   - SVG-Diagramme durch pdfmake-Canvas ersetzt (renderten nicht sauber)
   - Score-Donut durch elegante Zahl-Box ersetzt
   - Metadaten für Kompass in PDF-Info-Feld (unsichtbar) statt Text
   ============================================================ */

const NAVY = '#00305B';
const NAVY_DARK = '#082742';
const ORANGE = '#F18423';
const GRAY = '#54595F';
const GRAYLIGHT = '#9AA0A6';
const BG = '#F7F8FA';
const BG_WARM = '#FFF5EB';

/* ---------- Ligatur-Fix für pdfmake/Roboto ----------
   Fügt einen Zero-Width-Space (\u200B) in problematische Buchstaben-
   kombinationen ein, damit Roboto die Ligaturen (fi, fl, ffi, ffl)
   nicht bildet. Der ZWSP ist visuell unsichtbar. */
function fix(s) {
  if (s == null) return '';
  return String(s)
    .replace(/ffi/g, 'ff\u200Bi')
    .replace(/ffl/g, 'ff\u200Bl')
    .replace(/fi/g, 'f\u200Bi')
    .replace(/fl/g, 'f\u200Bl');
}

/* Anzeigetext zu einem gespeicherten Code aus data.js finden */
function labelOf(list, val) {
  const hit = (list || []).find(o => o.val === val);
  return hit ? hit.label : (val || '–');
}

function dateStr() {
  const d = new Date();
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return d.getDate() + '. ' + monate[d.getMonth()] + ' ' + d.getFullYear();
}

/* ---------- Score-Donut als eleganter Zahl-Block (statt SVG) ---------- */
function scoreBlock(overall) {
  return {
    table: {
      widths: [130],
      body: [[{
        stack: [
          { text: '' + overall, fontSize: 44, bold: true, color: NAVY, alignment: 'center', margin: [0, 18, 0, 0] },
          { text: fix('von 100'), fontSize: 10, color: GRAY, alignment: 'center', margin: [0, 0, 0, 18] },
        ],
        fillColor: BG_WARM,
      }]],
    },
    layout: {
      hLineWidth: () => 3,
      vLineWidth: () => 3,
      hLineColor: () => ORANGE,
      vLineColor: () => ORANGE,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
  };
}

/* ---------- Stufen-Balken als pdfmake-Canvas ---------- */
function stufenBars(scores) {
  const BAR_WIDTH = 280;
  const BAR_HEIGHT = 12;
  const ROW_HEIGHT = 24;
  const LABEL_W = 180;

  const rows = scores.percent.map((p, i) => {
    const filled = Math.max(2, Math.round(p / 100 * BAR_WIDTH));
    const isDom = i === scores.dom;
    return [
      { text: fix('Stufe ' + (i + 1) + ': ' + STUFEN[i]), fontSize: 10, color: NAVY, bold: isDom, margin: [0, 4, 0, 0] },
      {
        canvas: [
          { type: 'rect', x: 0, y: 6, w: BAR_WIDTH, h: BAR_HEIGHT, r: 6, color: '#EEEEEE' },
          { type: 'rect', x: 0, y: 6, w: filled, h: BAR_HEIGHT, r: 6, color: STUFEN_FARBEN[i] },
        ],
      },
      { text: p + '%', fontSize: 10, bold: true, color: NAVY, alignment: 'right', margin: [0, 4, 0, 0] },
    ];
  });

  return {
    table: {
      widths: [LABEL_W, BAR_WIDTH, 30],
      body: rows,
    },
    layout: 'noBorders',
  };
}

/* ---------- Header und Footer ---------- */
function pageHeader(subtitle) {
  return {
    columns: [
      {
        stack: [
          { text: fix('TRUST UNTERNEHMER'), style: 'brand' },
          { text: fix('Unternehmer-Score'), style: 'brandLarge' },
          { text: fix(subtitle), style: 'brandSubtitle' },
        ],
        width: '*',
      },
      {
        stack: [
          { text: fix('Ergebnis vom'), style: 'metaLabel', alignment: 'right' },
          { text: dateStr(), style: 'metaValue', alignment: 'right' },
        ],
        width: 'auto',
      },
    ],
    margin: [0, 0, 0, 20],
  };
}

function footer(pageLabel) {
  return function (currentPage, pageCount) {
    return {
      columns: [
        { text: fix('TRUST Unternehmer-Score · trust-unternehmer.de'), style: 'footerText', alignment: 'left' },
        { text: fix((pageLabel || '') + ' · Seite ') + currentPage + ' / ' + pageCount, style: 'footerText', alignment: 'right' },
      ],
      margin: [40, 20, 40, 0],
    };
  };
}

/* ---------- Gemeinsame Styles ---------- */
const commonStyles = {
  brand: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 2 },
  brandLarge: { fontSize: 24, bold: true, color: NAVY, margin: [0, 2, 0, 2] },
  brandSubtitle: { fontSize: 11, italics: true, color: GRAY },
  metaLabel: { fontSize: 8, color: GRAY, characterSpacing: 1 },
  metaValue: { fontSize: 11, bold: true, color: NAVY },
  section: { fontSize: 13, bold: true, color: NAVY, margin: [0, 12, 0, 6] },
  sectionEyebrow: { fontSize: 8, bold: true, color: ORANGE, characterSpacing: 1.5, margin: [0, 10, 0, 2] },
  h3: { fontSize: 11, bold: true, color: NAVY, margin: [0, 8, 0, 4] },
  h4: { fontSize: 10, bold: true, color: NAVY, margin: [0, 6, 0, 3] },
  body: { fontSize: 10, color: '#222', lineHeight: 1.45 },
  quote: { fontSize: 11, italics: true, color: ORANGE, bold: true, margin: [0, 4, 0, 8] },
  footerText: { fontSize: 8, color: GRAYLIGHT },
  boxTitle: { fontSize: 11, bold: true, color: NAVY, margin: [0, 0, 0, 4] },
  tableHeader: { bold: true, fontSize: 9, color: '#FFFFFF', fillColor: NAVY, margin: [4, 4, 4, 4] },
  tableCell: { fontSize: 9, color: '#222', margin: [4, 3, 4, 3] },
};

/* ---------- Namensaufbereitung ----------
   Schützt gegen Doppelungen, wenn im Feld "Name" bereits der
   vollständige Name steht (z. B. Vorname "Thomas", Name "Thomas Brandenburger").
   Ergebnis ist immer genau ein vollständiger Name. */
function fullName(lead) {
  var v = String((lead && lead.vorname) || '').trim().replace(/\s+/g, ' ');
  var n = String((lead && lead.name) || '').trim().replace(/\s+/g, ' ');
  if (!v) return n;
  if (!n) return v;
  if (n.toLowerCase() === v.toLowerCase()) return n;
  if (n.toLowerCase().indexOf(v.toLowerCase() + ' ') === 0) return n;
  if (n.toLowerCase().lastIndexOf(' ' + v.toLowerCase()) === n.length - v.length - 1) return n;
  return v + ' ' + n;
}

/* ---------- Kunden-PDF ---------- */
async function generateCustomerPdf(scores, lead) {
  const kern = STUFEN_KERNAUSSAGE[scores.dom];
  const schritte = STUFEN_SCHRITTE[scores.dom];
  const content = [];

  content.push(pageHeader('Reifegrad deiner Unternehmensführung'));

  // Empfänger-Zeile
  content.push({
    text: fix('Für: ' + fullName(lead) + (lead.firma ? ', ' + lead.firma : '')),
    style: 'body',
    margin: [0, 0, 0, 12],
  });

  // Hinweis-Box
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: fix('Dies ist eine strukturierte Standortbestimmung – kein Urteil. Nutze das Ergebnis als Ausgangspunkt für die Reflexion und für unser Klarheits-Gespräch.'),
        style: 'body', color: NAVY, fillColor: BG, margin: [10, 8, 10, 8],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== TEIL 1: GESAMT-ERGEBNIS ==========
  content.push({ text: fix('TEIL 1'), style: 'sectionEyebrow' });
  content.push({ text: fix('Dein Gesamtergebnis'), style: 'section' });

  content.push({
    columns: [
      { width: 130, stack: [scoreBlock(scores.overall)] },
      {
        stack: [
          { text: fix('Dominante Stufe'), style: 'metaLabel' },
          { text: fix('Stufe ' + (scores.dom + 1) + ': ' + STUFEN[scores.dom]), style: { fontSize: 14, bold: true, color: ORANGE }, margin: [0, 2, 0, 12] },
          { text: fix('Größter Hebel'), style: 'metaLabel' },
          { text: fix(STUFEN[scores.weakest]), style: { fontSize: 12, bold: true, color: NAVY }, margin: [0, 2, 0, 0] },
        ],
        width: '*',
        margin: [16, 15, 0, 0],
      },
    ],
    margin: [0, 0, 0, 16],
  });

  // Stufen-Balken
  content.push({ text: fix('Deine Verteilung über die 5 Reifegrad-Stufen'), style: 'h3' });
  content.push(stufenBars(scores));
  content.push({ text: '', margin: [0, 0, 0, 8] });

  content.push({
    text: fix('Was diese Grafik zeigt: Wie viel Prozent deiner Verhaltensweisen fallen in welche Entwicklungsstufe. Deine dominante Stufe ist orange hervorgehoben – dort findet aktuell dein Alltag hauptsächlich statt.'),
    style: 'body',
    margin: [0, 0, 0, 16],
  });

  // ========== TEIL 2: WAS DAS BEDEUTET ==========
  content.push({ text: fix('TEIL 2'), style: 'sectionEyebrow' });
  content.push({ text: fix('Was dein Ergebnis bedeutet'), style: 'section' });

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: fix(kern.kurz), style: 'boxTitle', color: ORANGE },
          { text: fix(kern.lang), style: 'body', margin: [0, 4, 0, 0] },
        ],
        fillColor: BG_WARM, margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== TEIL 3: NÄCHSTE SCHRITTE ==========
  content.push({ text: fix('TEIL 3'), style: 'sectionEyebrow' });
  content.push({ text: fix('Deine drei nächsten Schritte'), style: 'section' });
  content.push({
    text: fix('Konkrete Impulse, die du in den nächsten 30 Tagen anpacken kannst:'),
    style: 'body',
    margin: [0, 0, 0, 10],
  });

  schritte.forEach((s, i) => {
    content.push({
      columns: [
        {
          width: 30,
          stack: [{
            table: {
              widths: [22],
              body: [[{ text: (i + 1), color: '#FFFFFF', bold: true, fontSize: 12, alignment: 'center', fillColor: ORANGE, margin: [0, 4, 0, 4] }]],
            }, layout: 'noBorders',
          }],
        },
        { text: fix(s), style: 'body', width: '*', margin: [0, 4, 0, 0] },
      ],
      margin: [0, 0, 0, 8],
    });
  });

  // ========== TEIL 4: KLARHEITS-GESPRÄCH — Nutzen-Framing ==========
  content.push({ text: fix('TEIL 4'), style: 'sectionEyebrow' });
  content.push({ text: fix('Dein nächster Schritt: 30 Minuten Klarheit'), style: 'section' });

  content.push({
    text: fix('Der Score gibt dir eine Standortbestimmung. Was er nicht leisten kann: die individuelle Übersetzung in deinen Alltag. Genau dafür ist das Klarheits-Gespräch da.'),
    style: 'body', margin: [0, 0, 0, 12],
  });

  // Was wir gemeinsam sortieren
  content.push({ text: fix('In 30 Minuten sortieren wir gemeinsam:'), style: 'h4' });
  const sortierpunkte = [
    'Was steckt hinter deinem Ergebnis wirklich?',
    'Wo liegt dein größter Hebel für die nächsten Monate?',
    'Welches Format passt zu deiner Situation – oder brauchst du gerade gar keins?',
  ];
  sortierpunkte.forEach(p => {
    content.push({
      columns: [
        { text: '•', width: 12, style: { fontSize: 11, bold: true, color: ORANGE } },
        { text: fix(p), style: 'body', width: '*' },
      ],
      margin: [0, 0, 0, 4],
    });
  });

  // Format-Details in einer warm-orangen Box
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: fix('DAS FORMAT'), style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 }, margin: [0, 0, 0, 6] },
          { text: fix('• 30 Minuten, online über Zoom oder Teams'), style: 'body', margin: [0, 0, 0, 2] },
          { text: fix('• Kostenfrei, keine Verpflichtung'), style: 'body', margin: [0, 0, 0, 2] },
          { text: fix('• Am Ende entscheidest du frei, wie du weitergehen möchtest'), style: 'body', margin: [0, 0, 0, 2] },
          { text: fix('• Keine Verkaufsschleife, kein Nachfassen ohne dein OK'), style: 'body', margin: [0, 0, 0, 0] },
        ],
        fillColor: BG_WARM, margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 14, 0, 14],
  });

  // Zur Vorbereitung
  content.push({ text: fix('Zur Vorbereitung'), style: 'h4' });
  content.push({
    text: fix('Falls du dich für ein Gespräch entscheidest, notiere dir vorher kurze Antworten auf diese drei Fragen. Das macht das Gespräch für dich am wertvollsten:'),
    style: 'body', margin: [0, 0, 0, 8],
  });
  const gespraechsfragen = [
    'Wenn dein Ergebnis dich überrascht: Womit hättest du selbst gerechnet – und woran könnte der Unterschied liegen?',
    'Bei welcher konkreten Situation in den letzten Wochen hast du gedacht: „So kann es nicht weitergehen"?',
    'Wenn du in 12 Monaten eine Stufe weiter wärst: Was wäre in deinem Unternehmen anders – in Zeit, in Umsatz, in dir selbst?',
  ];
  gespraechsfragen.forEach((f, i) => {
    content.push({
      columns: [
        { text: (i + 1) + '.', width: 15, style: { fontSize: 10, bold: true, color: ORANGE } },
        { text: fix(f), style: 'body', width: '*' },
      ],
      margin: [0, 0, 0, 6],
    });
  });

  // Kontakt
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: fix('TERMIN ANFRAGEN'), style: { fontSize: 9, bold: true, color: '#FFFFFF', characterSpacing: 1.5 }, margin: [0, 0, 0, 4] },
          { text: fix('Ein kurzer Zwei-Zeiler mit ein bis zwei Terminvorschlägen reicht.'), style: { fontSize: 10, color: '#FFFFFF' }, margin: [0, 0, 0, 2] },
          { text: fix('Ich melde mich innerhalb von 24 Stunden.'), style: { fontSize: 10, color: '#FFFFFF' }, margin: [0, 0, 0, 6] },
          { text: fix('tb@trust-unternehmer.de'), style: { fontSize: 12, bold: true, color: '#FFFFFF' } },
        ],
        fillColor: NAVY, margin: [14, 12, 14, 12],
      }]],
    }, layout: 'noBorders',
    margin: [0, 12, 0, 0],
  });

  // Cross-Reference auf Profil
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: fix('ÜBRIGENS'), style: 'sectionEyebrow', margin: [0, 0, 0, 4] },
          { text: fix('Willst du auch wissen, wer du in deiner Unternehmerrolle bist?'), style: 'boxTitle' },
          { text: fix('Das TRUST Unternehmer-Profil ergänzt den Score um die persönliche Perspektive: Verhaltensstil und Motive. Für Coaching-Kunden.'), style: 'body', margin: [0, 2, 0, 6] },
          { text: fix('trust-unternehmer.de/profil'), style: { fontSize: 10, bold: true, color: ORANGE } },
        ],
        fillColor: BG, margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 20, 0, 0],
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    content: content,
    styles: commonStyles,
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#222' },
    footer: footer('Für ' + fullName(lead)),
    info: {
      title: 'TRUST Unternehmer-Score',
      author: 'Thomas Brandenburger',
      subject: 'Reifegrad-Auswertung für ' + fullName(lead),
    },
  };

  return await new Promise(resolve => {
    pdfMake.createPdf(docDefinition).getBase64(resolve);
  });
}

/* ---------- Coach-PDF ---------- */
async function generateCoachPdf(scores, lead, answers) {
  const kern = STUFEN_KERNAUSSAGE[scores.dom];
  const hinweise = COACH_HINWEISE[scores.dom];
  const content = [];

  content.push(pageHeader('COACH-VERSION · Reifegrad-Auswertung'));

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: fix('COACH-VERSION – vertraulich\nKunde: ' + fullName(lead) +
              (lead.firma ? ' · ' + lead.firma : '') +
              (lead.email ? ' · ' + lead.email : '') +
              (lead.plz || lead.ort ? '\n' + (lead.plz ? lead.plz + ' ' : '') + (lead.ort || '') : '')),
        style: 'body', color: NAVY, fillColor: BG_WARM, margin: [10, 8, 10, 8],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== ZIELGRUPPEN-EINORDNUNG ==========
  const zg = classifyZielgruppe(lead);
  const zgFarbe = (zg.status === 'kern') ? '#27AE60'
                : (zg.status === 'kern_einzelfall') ? '#D4A017'
                : (zg.status === 'peer') ? NAVY : GRAY;

  content.push({ text: fix('ZIELGRUPPEN-EINORDNUNG'), style: 'sectionEyebrow' });
  content.push({ text: fix('Nach Zielgruppen-Definition v1'), style: 'section' });

  content.push({
    table: {
      widths: [180, '*'],
      body: [
        [{ text: fix('Kreis'), style: 'tableCell', color: GRAY },
         { text: fix(zg.label), style: 'tableCell', bold: true, color: zgFarbe }],
        [{ text: fix('Rolle'), style: 'tableCell', color: GRAY },
         { text: fix(labelOf(ROLLEN, lead.rolle)), style: 'tableCell' }],
        [{ text: fix('Mitarbeitende'), style: 'tableCell', color: GRAY },
         { text: fix(labelOf(MITARBEITER, lead.mitarbeiter)), style: 'tableCell' }],
        [{ text: fix('Betriebsart'), style: 'tableCell', color: GRAY },
         { text: fix(labelOf(BETRIEBSARTEN, lead.betriebsart)), style: 'tableCell' }],
        [{ text: fix('Einzugsgebiet'), style: 'tableCell', color: GRAY },
         { text: fix(zg.region ? 'ja' : 'nein'), style: 'tableCell' }],
        [{ text: fix('Abweichungen'), style: 'tableCell', color: GRAY },
         { text: fix(zg.abweichungen.length ? zg.abweichungen.join(' · ') : 'keine'), style: 'tableCell' }],
      ],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== KURZÜBERSICHT ==========
  content.push({ text: fix('KURZÜBERSICHT'), style: 'sectionEyebrow' });
  content.push({ text: fix('Profil auf einen Blick'), style: 'section' });

  content.push({
    table: {
      widths: [180, '*'],
      body: [
        [{ text: fix('Gesamtscore'), style: 'tableCell', color: GRAY }, { text: scores.overall + ' / 100', style: 'tableCell', bold: true, color: ORANGE }],
        [{ text: fix('Dominante Stufe'), style: 'tableCell', color: GRAY }, { text: fix('Stufe ' + (scores.dom + 1) + ' – ' + STUFEN[scores.dom]) + ' (' + scores.percent[scores.dom] + '%)', style: 'tableCell', bold: true }],
        [{ text: fix('Stärkste Stufe'), style: 'tableCell', color: GRAY }, { text: fix('Stufe ' + (scores.strongest + 1) + ' – ' + STUFEN[scores.strongest]) + ' (' + scores.percent[scores.strongest] + '%)', style: 'tableCell' }],
        [{ text: fix('Größter Hebel (schwächste Stufe)'), style: 'tableCell', color: GRAY }, { text: fix('Stufe ' + (scores.weakest + 1) + ' – ' + STUFEN[scores.weakest]) + ' (' + scores.percent[scores.weakest] + '%)', style: 'tableCell', bold: true, color: NAVY }],
        [{ text: fix('Bearbeitungszeit'), style: 'tableCell', color: GRAY }, { text: scores.elapsedMin ? (Math.round(scores.elapsedMin * 10) / 10) + ' Min' : 'n/a', style: 'tableCell' }],
      ],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // Verteilungs-Balken
  content.push({ text: fix('Verteilung über die 5 Stufen'), style: 'h3' });
  content.push(stufenBars(scores));
  content.push({ text: '', margin: [0, 0, 0, 16] });

  // ========== COACH-HINWEISE ==========
  content.push({ text: fix('COACH-HINWEISE'), style: 'sectionEyebrow' });
  content.push({ text: fix('Für die Vorbereitung des Klarheits-Gesprächs'), style: 'section' });

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: fix('Fokus'), style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 } },
          { text: fix(hinweise.fokus), style: 'body', margin: [0, 3, 0, 8] },
          { text: fix('Formatvorschlag'), style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 } },
          { text: fix(hinweise.formatvorschlag), style: 'body', margin: [0, 3, 0, 8] },
          { text: fix('Warnhinweis'), style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 } },
          { text: fix(hinweise.warnhinweis), style: 'body', margin: [0, 3, 0, 0] },
        ],
        fillColor: BG_WARM, margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16], pageBreak: 'after',
  });

  // ========== ROHDATEN ==========
  content.push({ text: fix('ROHDATEN · ALLE 40 ANTWORTEN'), style: 'sectionEyebrow' });
  content.push({ text: fix('Detaillierte Auswertung nach Stufen'), style: 'section' });

  const antwortLabels = ['gar nicht', 'kaum', 'teilweise', 'überwiegend', 'voll'];

  for (let ci = 0; ci < 5; ci++) {
    const stufenFragen = QUESTIONS.map((q, i) => ({ ...q, idx: i, answer: answers[i] !== null ? answers[i] : 0 })).filter(q => q.ci === ci);
    if (!stufenFragen.length) continue;

    content.push({
      text: fix('Stufe ' + (ci + 1) + ': ' + STUFEN[ci]) + ' (' + scores.percent[ci] + '%)',
      style: 'h3', color: STUFEN_FARBEN[ci], margin: [0, 10, 0, 6],
    });

    const rows = [
      [
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: fix('Frage'), style: 'tableHeader' },
        { text: fix('Antw.'), style: 'tableHeader', alignment: 'center' },
        { text: 'Wert', style: 'tableHeader', alignment: 'center' },
      ]
    ];
    stufenFragen.forEach(q => {
      const berechnungsWert = q.inv ? (4 - q.answer) : q.answer;
      rows.push([
        { text: 'F' + String(q.idx + 1).padStart(2, '0'), style: 'tableCell', alignment: 'center', color: GRAYLIGHT },
        { text: fix(q.text + (q.inv ? ' (invers)' : '')), style: 'tableCell' },
        { text: fix(antwortLabels[q.answer]), style: 'tableCell', alignment: 'center' },
        { text: String(berechnungsWert), style: 'tableCell', alignment: 'center', bold: true, color: NAVY },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: [30, '*', 60, 30],
        body: rows,
      },
      layout: {
        hLineWidth: (i) => i === 0 ? 0 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#EEEEEE',
      },
      margin: [0, 0, 0, 8],
    });
  }

  content.push({
    text: fix('Legende: 0 = gar nicht · 1 = kaum · 2 = teilweise · 3 = überwiegend · 4 = voll · „invers" = umgekehrt gewertet'),
    style: { fontSize: 8, color: GRAYLIGHT, italics: true },
    margin: [0, 4, 0, 16], pageBreak: 'after',
  });

  // ========== KUNDENANSICHT ==========
  content.push({ text: fix('AB HIER: WAS DER KUNDE SIEHT'), style: 'sectionEyebrow' });
  content.push({ text: fix('Identisch mit dem Kunden-PDF'), style: 'section', margin: [0, 0, 0, 14] });

  content.push({ text: fix('Dein Gesamtergebnis'), style: 'h3' });
  content.push({
    columns: [
      { width: 130, stack: [scoreBlock(scores.overall)] },
      {
        stack: [
          { text: fix('Dominante Stufe'), style: 'metaLabel' },
          { text: fix('Stufe ' + (scores.dom + 1) + ': ' + STUFEN[scores.dom]), style: { fontSize: 14, bold: true, color: ORANGE }, margin: [0, 2, 0, 12] },
          { text: fix('Größter Hebel'), style: 'metaLabel' },
          { text: fix(STUFEN[scores.weakest]), style: { fontSize: 12, bold: true, color: NAVY }, margin: [0, 2, 0, 0] },
        ],
        width: '*',
        margin: [16, 15, 0, 0],
      },
    ],
    margin: [0, 0, 0, 12],
  });

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: fix(kern.kurz), style: 'boxTitle', color: ORANGE },
          { text: fix(kern.lang), style: 'body', margin: [0, 4, 0, 0] },
        ],
        fillColor: BG_WARM, margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 12],
  });

  content.push({ text: fix('Drei nächste Schritte für den Kunden'), style: 'h3' });
  STUFEN_SCHRITTE[scores.dom].forEach((s, i) => {
    content.push({
      text: fix((i + 1) + '. ' + s),
      style: 'body',
      margin: [0, 0, 0, 4],
    });
  });

  /* ========== METADATEN für den Kompass-Import ==========
     Nicht mehr sichtbar im PDF: Die Metadaten werden im PDF-Info-Feld
     hinterlegt (subject/keywords). Der Klarheits-Kompass kann sie später
     über pdf.js aus dem Info-Feld auslesen, ohne dass sie im sichtbaren
     PDF-Inhalt auftauchen. */
  const metadata = 'TRUSTSCORE_META|' +
    'ov:' + scores.overall + '|' +
    'dom:' + scores.dom + '|' +
    'str:' + scores.strongest + '|' +
    'wk:' + scores.weakest + '|' +
    'p:' + scores.percent.join(',') + '|' +
    'em:' + (scores.elapsedMin ? Math.round(scores.elapsedMin * 10) / 10 : 0) + '|' +
    'ans:' + answers.map(a => a === null ? 'x' : a).join('') + '|' +
    'lead:' + encodeURIComponent(fullName(lead)) + '|' +
    'firma:' + encodeURIComponent(lead.firma || '') + '|' +
    'email:' + encodeURIComponent(lead.email || '') + '|' +
    'rolle:' + (lead.rolle || '') + '|' +
    'ma:' + (lead.mitarbeiter || '') + '|' +
    'betrieb:' + (lead.betriebsart || '') + '|' +
    'zg:' + (zg.status || '') + '|' +
    'reg:' + (zg.region ? 1 : 0) + '|' +
    'end';

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    content: content,
    styles: commonStyles,
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#222' },
    footer: footer('COACH · ' + fullName(lead)),
    info: {
      title: 'TRUST Unternehmer-Score Coach-Version',
      author: 'Thomas Brandenburger',
      subject: 'Coach-Auswertung für ' + fullName(lead),
      keywords: metadata,  // ← Metadaten hier drin, unsichtbar
    },
  };

  return await new Promise(resolve => {
    pdfMake.createPdf(docDefinition).getBase64(resolve);
  });
}
