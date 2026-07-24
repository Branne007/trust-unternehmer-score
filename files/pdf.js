/* ============================================================
   TRUST Unternehmer-Score · PDF-Generierung
   Client-seitige Erzeugung mit pdfmake (Kunde + Coach)
   ============================================================ */

const NAVY = '#00305B';
const NAVY_DARK = '#082742';
const ORANGE = '#F18423';
const GRAY = '#54595F';
const GRAYLIGHT = '#9AA0A6';
const BG = '#F7F8FA';

function dateStr() {
  const d = new Date();
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return d.getDate() + '. ' + monate[d.getMonth()] + ' ' + d.getFullYear();
}

/* ---------- SVG: Balkendiagramm der 5 Stufen ---------- */
function stufenBarSvg(scores) {
  const width = 480;
  const rowHeight = 32;
  const height = rowHeight * 5;
  const labelWidth = 200;
  const barMaxWidth = width - labelWidth - 50;

  let bars = '';
  for (let i = 0; i < 5; i++) {
    const y = i * rowHeight + 10;
    const p = scores.percent[i];
    const barW = Math.max(2, p / 100 * barMaxWidth);
    const color = STUFEN_FARBEN[i];
    const isDom = i === scores.dom;
    const fontWeight = isDom ? 'bold' : 'normal';
    bars += '<text x="0" y="' + (y + 4) + '" font-family="Arial" font-size="10" fill="' + NAVY + '" font-weight="' + fontWeight + '">' +
            'Stufe ' + (i + 1) + ': ' + STUFEN[i] + '</text>';
    bars += '<rect x="' + labelWidth + '" y="' + (y - 6) + '" width="' + barMaxWidth + '" height="10" rx="5" fill="#EEEEEE"/>';
    bars += '<rect x="' + labelWidth + '" y="' + (y - 6) + '" width="' + barW + '" height="10" rx="5" fill="' + color + '"/>';
    bars += '<text x="' + (width - 5) + '" y="' + (y + 4) + '" font-family="Arial" font-size="10" fill="' + NAVY + '" font-weight="bold" text-anchor="end">' + p + '%</text>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">' + bars + '</svg>';
}

/* ---------- SVG: Score-Donut ---------- */
function scoreDonutSvg(overall) {
  const size = 120;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = c * overall / 100;
  const cx = size / 2;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '">' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="#EEEEEE" stroke-width="' + stroke + '" fill="none"/>' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + ORANGE + '" stroke-width="' + stroke + '" fill="none" ' +
      'stroke-dasharray="' + filled + ' ' + c + '" transform="rotate(-90 ' + cx + ' ' + cx + ')" stroke-linecap="round"/>' +
    '<text x="' + cx + '" y="' + (cx + 4) + '" font-family="Arial" font-size="28" font-weight="900" fill="' + NAVY + '" text-anchor="middle">' + overall + '</text>' +
    '<text x="' + cx + '" y="' + (cx + 24) + '" font-family="Arial" font-size="10" fill="' + GRAY + '" text-anchor="middle">von 100</text>' +
  '</svg>';
}

/* ---------- Header und Footer ---------- */
function pageHeader(subtitle) {
  return {
    columns: [
      {
        stack: [
          { text: 'TRUST UNTERNEHMER', style: 'brand' },
          { text: 'Unternehmer-Score', style: 'brandLarge' },
          { text: subtitle, style: 'brandSubtitle' },
        ],
        width: '*',
      },
      {
        stack: [
          { text: 'Ergebnis vom', style: 'metaLabel', alignment: 'right' },
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
        { text: 'TRUST Unternehmer-Score · trust-unternehmer.de', style: 'footerText', alignment: 'left' },
        { text: (pageLabel || '') + ' · Seite ' + currentPage + ' / ' + pageCount, style: 'footerText', alignment: 'right' },
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
  metaHidden: { fontSize: 5, color: '#FFFFFF' },
};

/* ---------- Kunden-PDF ---------- */
async function generateCustomerPdf(scores, lead) {
  const kern = STUFEN_KERNAUSSAGE[scores.dom];
  const schritte = STUFEN_SCHRITTE[scores.dom];
  const content = [];

  content.push(pageHeader('Reifegrad deiner Unternehmensführung'));

  // Empfänger-Zeile
  content.push({
    text: 'Für: ' + lead.vorname + ' ' + lead.name + (lead.firma ? ', ' + lead.firma : ''),
    style: 'body',
    margin: [0, 0, 0, 12],
  });

  // Hinweis-Box
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: 'Dies ist eine strukturierte Standortbestimmung – kein Urteil. Nutze das Ergebnis als Ausgangspunkt für die Reflexion und für unser Klarheits-Gespräch.',
        style: 'body', color: NAVY, fillColor: BG, margin: [10, 8, 10, 8],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== TEIL 1: SCORE-ÜBERSICHT ==========
  content.push({ text: 'TEIL 1', style: 'sectionEyebrow' });
  content.push({ text: 'Dein Gesamtergebnis', style: 'section' });

  content.push({
    columns: [
      { svg: scoreDonutSvg(scores.overall), width: 120, alignment: 'left' },
      {
        stack: [
          { text: 'Dominante Stufe', style: 'metaLabel' },
          { text: 'Stufe ' + (scores.dom + 1) + ': ' + STUFEN[scores.dom], style: { fontSize: 14, bold: true, color: ORANGE }, margin: [0, 2, 0, 8] },
          { text: 'Größter Hebel', style: 'metaLabel' },
          { text: STUFEN[scores.weakest], style: { fontSize: 12, bold: true, color: NAVY }, margin: [0, 2, 0, 0] },
        ],
        width: '*',
        margin: [16, 8, 0, 0],
      },
    ],
    margin: [0, 0, 0, 12],
  });

  // Stufen-Balken
  content.push({ text: 'Deine Verteilung über die 5 Reifegrad-Stufen', style: 'h3' });
  content.push({ svg: stufenBarSvg(scores), width: 480, margin: [0, 0, 0, 12] });

  content.push({
    text: 'Was diese Grafik zeigt: Wie viel Prozent deiner Verhaltensweisen fallen in welche Entwicklungsstufe. Deine dominante Stufe ist orange markiert – dort findet aktuell dein Alltag hauptsächlich statt.',
    style: 'body',
    margin: [0, 0, 0, 16],
  });

  // ========== TEIL 2: WAS DAS BEDEUTET ==========
  content.push({ text: 'TEIL 2', style: 'sectionEyebrow' });
  content.push({ text: 'Was dein Ergebnis bedeutet', style: 'section' });

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: kern.kurz, style: 'boxTitle', color: ORANGE },
          { text: kern.lang, style: 'body', margin: [0, 4, 0, 0] },
        ],
        fillColor: '#FFF5EB', margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== TEIL 3: NÄCHSTE SCHRITTE ==========
  content.push({ text: 'TEIL 3', style: 'sectionEyebrow' });
  content.push({ text: 'Deine drei nächsten Schritte', style: 'section' });
  content.push({
    text: 'Konkrete Impulse, die du in den nächsten 30 Tagen anpacken kannst:',
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
        { text: s, style: 'body', width: '*', margin: [0, 4, 0, 0] },
      ],
      margin: [0, 0, 0, 8],
    });
  });

  // ========== TEIL 4: FÜR DAS KLARHEITS-GESPRÄCH ==========
  content.push({ text: 'TEIL 4', style: 'sectionEyebrow' });
  content.push({ text: 'Für unser Klarheits-Gespräch', style: 'section' });
  content.push({
    text: 'Wenn du diesen Score als Grundlage für ein persönliches Gespräch nutzen möchtest, überlege dir vorher folgende drei Fragen. Notiere dir kurz eine Antwort:',
    style: 'body', margin: [0, 0, 0, 10],
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
        { text: f, style: 'body', width: '*' },
      ],
      margin: [0, 0, 0, 6],
    });
  });

  // Cross-Reference auf Profil
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'ÜBRIGENS', style: 'sectionEyebrow', margin: [0, 0, 0, 4] },
          { text: 'Willst du auch wissen, wer du in deiner Unternehmerrolle bist?', style: 'boxTitle' },
          { text: 'Das TRUST Unternehmer-Profil ergänzt den Score um die persönliche Perspektive: Verhaltensstil und Motive. Für Coaching-Kunden.', style: 'body', margin: [0, 2, 0, 6] },
          { text: 'trust-unternehmer.de/profil', style: { fontSize: 10, bold: true, color: ORANGE } },
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
    footer: footer('Für ' + lead.vorname + ' ' + lead.name),
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
        text: 'COACH-VERSION – vertraulich\nKunde: ' + lead.vorname + ' ' + lead.name +
              (lead.firma ? ' · ' + lead.firma : '') +
              (lead.email ? ' · ' + lead.email : '') +
              (lead.plz || lead.ort ? '\n' + (lead.plz ? lead.plz + ' ' : '') + (lead.ort || '') : ''),
        style: 'body', color: NAVY, fillColor: '#FFF5EB', margin: [10, 8, 10, 8],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ========== KURZÜBERSICHT ==========
  content.push({ text: 'KURZÜBERSICHT', style: 'sectionEyebrow' });
  content.push({ text: 'Profil auf einen Blick', style: 'section' });

  content.push({
    table: {
      widths: [180, '*'],
      body: [
        [{ text: 'Gesamtscore', style: 'tableCell', color: GRAY }, { text: scores.overall + ' / 100', style: 'tableCell', bold: true, color: ORANGE }],
        [{ text: 'Dominante Stufe', style: 'tableCell', color: GRAY }, { text: 'Stufe ' + (scores.dom + 1) + ' – ' + STUFEN[scores.dom] + ' (' + scores.percent[scores.dom] + '%)', style: 'tableCell', bold: true }],
        [{ text: 'Stärkste Stufe', style: 'tableCell', color: GRAY }, { text: 'Stufe ' + (scores.strongest + 1) + ' – ' + STUFEN[scores.strongest] + ' (' + scores.percent[scores.strongest] + '%)', style: 'tableCell' }],
        [{ text: 'Größter Hebel (schwächste Stufe)', style: 'tableCell', color: GRAY }, { text: 'Stufe ' + (scores.weakest + 1) + ' – ' + STUFEN[scores.weakest] + ' (' + scores.percent[scores.weakest] + '%)', style: 'tableCell', bold: true, color: NAVY }],
        [{ text: 'Bearbeitungszeit', style: 'tableCell', color: GRAY }, { text: scores.elapsedMin ? (Math.round(scores.elapsedMin * 10) / 10) + ' Min' : 'n/a', style: 'tableCell' }],
      ],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // Verteilungs-Balken
  content.push({ text: 'Verteilung über die 5 Stufen', style: 'h3' });
  content.push({ svg: stufenBarSvg(scores), width: 480, margin: [0, 4, 0, 16] });

  // ========== COACH-HINWEISE ==========
  content.push({ text: 'COACH-HINWEISE', style: 'sectionEyebrow' });
  content.push({ text: 'Für die Vorbereitung des Klarheits-Gesprächs', style: 'section' });

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'Fokus', style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 } },
          { text: hinweise.fokus, style: 'body', margin: [0, 3, 0, 8] },
          { text: 'Formatvorschlag', style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 } },
          { text: hinweise.formatvorschlag, style: 'body', margin: [0, 3, 0, 8] },
          { text: 'Warnhinweis', style: { fontSize: 9, bold: true, color: ORANGE, characterSpacing: 1.5 } },
          { text: hinweise.warnhinweis, style: 'body', margin: [0, 3, 0, 0] },
        ],
        fillColor: '#FFF5EB', margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 16], pageBreak: 'after',
  });

  // ========== ROHDATEN ==========
  content.push({ text: 'ROHDATEN · ALLE 40 ANTWORTEN', style: 'sectionEyebrow' });
  content.push({ text: 'Detaillierte Auswertung nach Stufen', style: 'section' });

  const antwortLabels = ['gar nicht', 'kaum', 'teilweise', 'überwiegend', 'voll'];

  // Antworten nach Stufen gruppiert
  for (let ci = 0; ci < 5; ci++) {
    const stufenFragen = QUESTIONS.map((q, i) => ({ ...q, idx: i, answer: answers[i] !== null ? answers[i] : 0 })).filter(q => q.ci === ci);
    if (!stufenFragen.length) continue;

    content.push({
      text: 'Stufe ' + (ci + 1) + ': ' + STUFEN[ci] + ' (' + scores.percent[ci] + '%)',
      style: 'h3', color: STUFEN_FARBEN[ci], margin: [0, 10, 0, 6],
    });

    const rows = [
      [
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'Frage', style: 'tableHeader' },
        { text: 'Antw.', style: 'tableHeader', alignment: 'center' },
        { text: 'Wert', style: 'tableHeader', alignment: 'center' },
      ]
    ];
    stufenFragen.forEach(q => {
      // Der interne "Wert" (nach Invertierung, so wie er in die Berechnung eingeht)
      const berechnungsWert = q.inv ? (4 - q.answer) : q.answer;
      rows.push([
        { text: 'F' + String(q.idx + 1).padStart(2, '0'), style: 'tableCell', alignment: 'center', color: GRAYLIGHT },
        { text: q.text + (q.inv ? ' (invers)' : ''), style: 'tableCell' },
        { text: antwortLabels[q.answer], style: 'tableCell', alignment: 'center' },
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
    text: 'Legende: 0 = gar nicht · 1 = kaum · 2 = teilweise · 3 = überwiegend · 4 = voll · „invers" = umgekehrt gewertet',
    style: { fontSize: 8, color: GRAYLIGHT, italics: true },
    margin: [0, 4, 0, 16], pageBreak: 'after',
  });

  // ========== KUNDENANSICHT (das, was der Kunde sieht) ==========
  content.push({ text: 'AB HIER: WAS DER KUNDE SIEHT', style: 'sectionEyebrow' });
  content.push({ text: 'Identisch mit dem Kunden-PDF', style: 'section', margin: [0, 0, 0, 14] });

  content.push({ text: 'Dein Gesamtergebnis', style: 'h3' });
  content.push({
    columns: [
      { svg: scoreDonutSvg(scores.overall), width: 120, alignment: 'left' },
      {
        stack: [
          { text: 'Dominante Stufe', style: 'metaLabel' },
          { text: 'Stufe ' + (scores.dom + 1) + ': ' + STUFEN[scores.dom], style: { fontSize: 14, bold: true, color: ORANGE }, margin: [0, 2, 0, 8] },
          { text: 'Größter Hebel', style: 'metaLabel' },
          { text: STUFEN[scores.weakest], style: { fontSize: 12, bold: true, color: NAVY }, margin: [0, 2, 0, 0] },
        ],
        width: '*',
        margin: [16, 8, 0, 0],
      },
    ],
    margin: [0, 0, 0, 12],
  });

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: kern.kurz, style: 'boxTitle', color: ORANGE },
          { text: kern.lang, style: 'body', margin: [0, 4, 0, 0] },
        ],
        fillColor: '#FFF5EB', margin: [12, 10, 12, 10],
      }]],
    }, layout: 'noBorders',
    margin: [0, 0, 0, 12],
  });

  content.push({ text: 'Drei nächste Schritte für den Kunden', style: 'h3' });
  STUFEN_SCHRITTE[scores.dom].forEach((s, i) => {
    content.push({
      text: (i + 1) + '. ' + s,
      style: 'body',
      margin: [0, 0, 0, 4],
    });
  });

  // ========== METADATEN-ZEILE für den Kompass-Import ==========
  // Diese Zeile ist maschinenlesbar und wird vom TRUST Klarheits-Kompass
  // beim PDF-Upload automatisch geparst. Sehr klein und weiß, damit sie
  // im ausgedruckten PDF nicht auffällt, aber in der Datei enthalten ist.
  const metadata = 'TRUSTSCORE_META|' +
    'ov:' + scores.overall + '|' +
    'dom:' + scores.dom + '|' +
    'str:' + scores.strongest + '|' +
    'wk:' + scores.weakest + '|' +
    'p:' + scores.percent.join(',') + '|' +
    'em:' + (scores.elapsedMin ? Math.round(scores.elapsedMin * 10) / 10 : 0) + '|' +
    'ans:' + answers.map(a => a === null ? 'x' : a).join('') + '|' +
    'lead:' + encodeURIComponent(lead.vorname + ' ' + lead.name) + '|' +
    'firma:' + encodeURIComponent(lead.firma || '') + '|' +
    'email:' + encodeURIComponent(lead.email || '') + '|' +
    'end';

  content.push({
    text: metadata,
    style: 'metaHidden',
    margin: [0, 20, 0, 0],
  });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    content: content,
    styles: commonStyles,
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#222' },
    footer: footer('COACH · ' + lead.vorname + ' ' + lead.name),
  };

  return await new Promise(resolve => {
    pdfMake.createPdf(docDefinition).getBase64(resolve);
  });
}
