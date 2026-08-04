/* ============================================================
   TRUST Unternehmer-Score · Content-Datenbank
   40 Fragen, 5 Reifegrad-Stufen, Textbausteine
   ============================================================ */

/* ---------- 5 Reifegrad-Stufen ---------- */
const STUFEN = ['Getriebener Macher', 'Alltagsgestalter', 'Leader', 'Systembauer', 'Gestaltender Unternehmer'];

/* Gewichtung der Stufen für den Gesamtscore.
   Höhere Stufen zählen stärker – wer weiter oben Verhalten zeigt,
   trägt mehr zum Gesamtwert bei. */
const GEWICHTUNG = [1, 1.5, 2, 2.5, 3];

/* ---------- 40 Fragen (ci = Cluster-Index 0-4, inv = invertiert) ---------- */
const QUESTIONS = [
  /* Stufe 1 · Getriebener Macher (9 Fragen) */
  { ci: 0, text: 'Ich musste in den letzten 4 Wochen häufig als „Feuerwehr" einspringen, um Stillstand zu vermeiden.', inv: true },
  { ci: 0, text: 'Wenn ich 2 Tage ausgefallen wäre, hätten viele Themen sofort eskaliert.', inv: true },
  { ci: 0, text: 'Mitarbeiter haben Probleme regelmäßig an mich zurückdelegiert.', inv: true },
  { ci: 0, text: 'Ich habe Aufgaben meiner Mitarbeiter übernommen, weil es „schneller ging".', inv: true },
  { ci: 0, text: 'Ich habe abends oder am Wochenende gearbeitet, um das Tagesgeschäft zu bewältigen.', inv: true },
  { ci: 0, text: 'Ich hatte beim Arbeitsstart klare Top-3-Prioritäten und habe sie eingehalten.', inv: false },
  { ci: 0, text: 'Ich hatte mindestens 2 Stunden ungestörte Fokuszeit pro Tag.', inv: false },
  { ci: 0, text: 'Ich wurde durch mehr als 10 Themenwechsel pro Tag unterbrochen.', inv: true },
  { ci: 0, text: 'Ich hatte das Gefühl, der Hauptengpass zu sein, der alles zusammenhalten muss.', inv: true },

  /* Stufe 2 · Alltagsgestalter (8 Fragen) */
  { ci: 1, text: 'Ich hatte eine stabile Wochen-/Tagesstruktur mit festen Fokuszeiten.', inv: false },
  { ci: 1, text: 'Ich hatte wöchentlich geblockte Zeit für Führung und Steuerung (nicht operativ).', inv: false },
  { ci: 1, text: 'Entscheidungen, die Führungskräfte hätten treffen können, landeten bei mir.', inv: true },
  { ci: 1, text: 'Ich habe delegierbare Routineaufgaben selbst erledigt.', inv: true },
  { ci: 1, text: 'Die Zuständigkeiten (wer entscheidet was) waren in Kernbereichen klar.', inv: false },
  { ci: 1, text: 'Ich habe Aufgaben/Projekte sichtbar per Tool oder Liste nachgehalten.', inv: false },
  { ci: 1, text: 'Ich habe „Ja" gesagt, obwohl die Kapazitäten eigentlich nicht reichten.', inv: true },
  { ci: 1, text: 'Ich habe konsequent meine Führungskräfte genutzt, statt selbst einzuspringen.', inv: false },

  /* Stufe 3 · Leader (8 Fragen) */
  { ci: 2, text: 'Wir nutzen ein aktuelles Organigramm aktiv im Alltag.', inv: false },
  { ci: 2, text: 'Für alle Schlüsselrollen existieren klare Stellenbeschreibungen.', inv: false },
  { ci: 2, text: 'Ich habe strukturierte Mitarbeitergespräche mit Zielen und Feedback geführt.', inv: false },
  { ci: 2, text: 'Unsere Team-Meetings haben eine Agenda, ein Protokoll und Nachverfolgung.', inv: false },
  { ci: 2, text: 'Ich habe echte Verantwortung inklusive Entscheidungsspielraum übertragen.', inv: false },
  { ci: 2, text: 'Abläufe hingen stark von einzelnen „Helden" im Team ab.', inv: true },
  { ci: 2, text: 'Identische Fehler sind wiederholt aufgetreten, ohne dauerhafte Beseitigung.', inv: true },
  { ci: 2, text: 'Führungskennzahlen sind im Team bekannt und werden besprochen.', inv: false },

  /* Stufe 4 · Systembauer (8 Fragen) */
  { ci: 3, text: 'Unsere Kernprozesse sind dokumentiert und die Standards werden genutzt.', inv: false },
  { ci: 3, text: 'Für alle wichtigen Prozesse gibt es klare Verantwortliche und Stellvertreter.', inv: false },
  { ci: 3, text: 'Wir haben aktiv bestehende Prozesse vereinfacht und optimiert.', inv: false },
  { ci: 3, text: 'Für das Onboarding neuer Mitarbeiter gibt es Checklisten und Standards.', inv: false },
  { ci: 3, text: 'Wir nutzen systematische Fehleranalysen (z.\u00a0B. 5-Why) mit Standard-Anpassung.', inv: false },
  { ci: 3, text: 'Es gibt ein System zur Erfassung und Auswertung von Prozessabweichungen.', inv: false },
  { ci: 3, text: 'Unsere Abläufe sind weitgehend automatisiert oder toolgestützt.', inv: false },
  { ci: 3, text: 'Zentrale Kennzahlen (Liquidität, Auslastung etc.) sind in Echtzeit verfügbar.', inv: false },

  /* Stufe 5 · Gestaltender Unternehmer (7 Fragen) */
  { ci: 4, text: 'Wir haben eine klare, im Führungsteam verbindliche Strategie.', inv: false },
  { ci: 4, text: 'Ich priorisiere konsequent durch Fokusentscheidungen und „Stop-Doing"-Listen.', inv: false },
  { ci: 4, text: 'Unsere Strategie wurde aktiv an veränderte Rahmenbedingungen angepasst.', inv: false },
  { ci: 4, text: 'Das Unternehmen könnte mehrere Wochen ohne mich stabil laufen.', inv: false },
  { ci: 4, text: 'Ich arbeite hauptsächlich AM Unternehmen (Innovation, Markt) statt im Betrieb.', inv: false },
  { ci: 4, text: 'Wir haben einen klaren Rhythmus für Strategie- und Zielreviews.', inv: false },
  { ci: 4, text: 'Die Qualität unserer Arbeit ist unabhängig von einzelnen Schlüsselpersonen.', inv: false },
];

/* ---------- Likert-Skala (Antwort-Optionen) ---------- */
const LIKERT = [
  { val: 4, label: 'Trifft voll zu',        badge: 'A' },
  { val: 3, label: 'Trifft überwiegend zu', badge: 'B' },
  { val: 2, label: 'Trifft teilweise zu',   badge: 'C' },
  { val: 1, label: 'Trifft kaum zu',        badge: 'D' },
  { val: 0, label: 'Trifft gar nicht zu',   badge: 'E' },
];

/* ---------- Kernaussage pro dominanter Stufe ---------- */
const STUFEN_KERNAUSSAGE = [
  {
    kurz: 'Du steckst noch tief im operativen Hamsterrad.',
    lang: 'Der Alltag frisst dich auf – zu viele Themen landen auf deinem Tisch, zu wenig läuft ohne dich. Was dir jetzt am meisten hilft: Verschaffe dir als erstes wieder Zeit, indem du konsequent loslässt und erste Strukturen einziehst, die dich entlasten.',
    hebel: 'Zeit und Struktur zurückgewinnen',
  },
  {
    kurz: 'Du hast bereits erste Strukturen, aber Entscheidungen landen noch zu oft bei dir.',
    lang: 'Du hast Routinen etabliert und die schlimmsten Feuer sind aus. Trotzdem ist dein Kalender voll und viele Themen brauchen dich weiterhin. Der nächste Sprung: Lerne konsequent zu delegieren und deine Führungskräfte in die Verantwortung zu bringen.',
    hebel: 'Führung und Delegation systematisieren',
  },
  {
    kurz: 'Führung ist bei dir etabliert – jetzt kommen die Systeme.',
    lang: 'Deine Führungsstruktur trägt und deine Führungskräfte übernehmen Verantwortung. Was noch fehlt: Systeme und Standards, die unabhängig von einzelnen Personen funktionieren. Der Hebel liegt in der Prozessarbeit.',
    hebel: 'Prozesse und Standards aufbauen',
  },
  {
    kurz: 'Deine Prozesse stehen solide – jetzt braucht es strategische Souveränität.',
    lang: 'Dein Unternehmen läuft weitgehend ohne dich – die Systeme tragen. Der nächste Schritt: Löse dich vom operativen Fokus, arbeite mehr AM statt IM Unternehmen und schärfe deine strategische Ausrichtung.',
    hebel: 'Strategische Souveränität entwickeln',
  },
  {
    kurz: 'Du arbeitest bereits hauptsächlich AM Unternehmen.',
    lang: 'Du bist an der Spitze der Entwicklungs-Treppe angekommen – kein Engpass mehr, sondern Gestalter. Jetzt geht es um Feinschliff: Strategische Ausrichtung verfeinern, neue Wachstumshebel identifizieren und die nächste Ebene der Gestaltungsfreiheit erschließen.',
    hebel: 'Neue Wachstumshebel identifizieren',
  },
];

/* ---------- 3 konkrete nächste Schritte pro dominanter Stufe ---------- */
const STUFEN_SCHRITTE = [
  [
    'Schaffe täglich mindestens 2 Stunden ungestörte Fokuszeit.',
    'Definiere 3 Aufgaben, die du diese Woche vollständig delegierst.',
    'Führe eine Unterbrechungs-Liste: Was landet immer wieder bei dir, obwohl andere es lösen könnten?',
  ],
  [
    'Erstelle eine Zuständigkeitskarte: Wer entscheidet was – ohne dich?',
    'Führe wöchentliche Steuerungsmeetings ein – Ziele statt Tagesgeschäft.',
    'Etabliere feste Zeiten für Führung, Strategie und Fokusarbeit.',
  ],
  [
    'Dokumentiere eure 5 wichtigsten Führungsprozesse als Vorlage.',
    'Identifiziere Helden-Abhängigkeiten und schaffe Stellvertreter.',
    'Führe ein monatliches Führungsteam-Review ein.',
  ],
  [
    'Lege in 30 Tagen Standards für alle undokumentierten Kernprozesse fest.',
    'Baue ein Dashboard mit 5–7 zentralen Kennzahlen.',
    'Plane einmal pro Quartal einen halben Tag Prozess-Review.',
  ],
  [
    'Führe ein jährliches Strategiereview ein.',
    'Erstelle einen Stop-Doing-Plan für das kommende Quartal.',
    'Identifiziere die wichtigste Marktchance des nächsten Jahres.',
  ],
];

/* ---------- Farbschema für die 5 Stufen ---------- */
const STUFEN_FARBEN = ['#C0392B', '#E07B39', '#D4A017', '#27AE60', '#00305B'];

/* ---------- Firmografische Auswahlfelder (Zielgruppen-Filter) ----------
   Grundlage: Zielgruppen-Definition v1 vom 3. August 2026.
   `val` sind stabile Codes und wandern unverändert in Encharge bzw. später
   in eine Datenbank. `label` ist reiner Anzeigetext und darf sich ändern. */
const ROLLEN = [
  { val: '',                     label: 'Bitte auswählen' },
  { val: 'inhaber',              label: 'Inhaber oder Mitgesellschafter' },
  { val: 'nachfolger_beteiligt', label: 'Nachfolger mit Beteiligung' },
  { val: 'gf_ohne_beteiligung',  label: 'Geschäftsführer ohne Beteiligung' },
  { val: 'fuehrungskraft',       label: 'Führungskraft' },
  { val: 'sonstiges',            label: 'Sonstiges' },
];

const MITARBEITER = [
  { val: '',        label: 'Bitte auswählen' },
  { val: 'bis14',   label: 'bis 14' },
  { val: '15_30',   label: '15 bis 30' },
  { val: '31_60',   label: '31 bis 60' },
  { val: '61_100',  label: '61 bis 100' },
  { val: 'ueber100',label: 'über 100' },
];

const BETRIEBSARTEN = [
  { val: '',              label: 'Bitte auswählen' },
  { val: 'fertigung',     label: 'Fertigung, Montage oder technische Leistung' },
  { val: 'handel',        label: 'Handel' },
  { val: 'dienstleistung',label: 'Dienstleistung' },
  { val: 'beratung',      label: 'Beratung, Kanzlei, Agentur' },
  { val: 'sonstiges',     label: 'Sonstiges' },
];

/* Klartext-Bezeichnungen der Zielgruppen-Kreise (nur intern sichtbar) */
const ZIELGRUPPEN_LABEL = {
  kern:           'Kernzielgruppe',
  kern_einzelfall:'Kernzielgruppe, Einzelfallprüfung',
  peer:           'Peer-Kreis',
  suchfeld:       'Suchfeld',
};

/* PLZ-Praefixe des Einzugsgebiets: Lahn-Dill, Siegerland, Westerwald,
   Limburg-Weilburg. Bei Bedarf hier erweitern. */
const REGION_PLZ = ['35', '56', '57', '65'];

/* ---------- Coach-Hinweise pro dominanter Stufe (nur im Coach-PDF) ---------- */
const COACH_HINWEISE = [
  {
    fokus: 'Der Kunde ist im Feuerwehr-Modus. Klarheits-Gespräch nutzt sich am besten, wenn er selbst benennen kann, was ihn im Alltag am meisten frisst.',
    formatvorschlag: 'Monatsgruppe bei Kernzielgruppen-Fit. INQA-Projekt, wenn Förderung das Risiko senken muss. Runder Tisch als niederschwelliger Einstieg.',
    warnhinweis: 'Vorsicht bei Preisgesprächen: Diese Zielgruppe rechnet reflexartig gegen operative Kosten. Wertfrage muss früh im Gespräch stehen.',
  },
  {
    fokus: 'Kunde hat erste Strukturen, aber die Führung greift noch nicht durch. Delegationsthema ist der Hebel.',
    formatvorschlag: 'Monatsgruppe bei Kernzielgruppe, Geschäftsführer-Kreis ab ca. 100 MA. INQA-Projekt bei akutem Delegationsthema. Beratungs-Projekt für Führungsteam-Diagnose.',
    warnhinweis: 'Achte darauf, ob der Kunde wirklich loslassen will – oder ob er nur „mehr Werkzeug" sucht. Letzteres führt zu unzufriedenen Kunden.',
  },
  {
    fokus: 'Kunde hat Führung im Griff, jetzt geht es um Systemreife. Prozesse und Standards sind das Thema.',
    formatvorschlag: 'Monatsgruppe für strategisches Sparring. Strategie-Sprint Kompakt oder Team, je nachdem ob ein Führungskreis vorhanden ist. Beratungs-Projekt bei konkretem Prozessthema.',
    warnhinweis: 'Diese Kunden sind oft schon in anderen Netzwerken. Argumentiere den Peer-Group-Vorteil klar über die Qualität der Teilnehmer.',
  },
  {
    fokus: 'Kunde ist reif für strategische Arbeit AM Unternehmen. Das Sparring wird auf Augenhöhe – anspruchsvoll für dich, wertvoll für ihn.',
    formatvorschlag: 'Strategie-Sprint Team, wenn ein Führungskreis existiert. Monatsgruppe nur bei Peer-Bereitschaft mit ähnlichem Reifegrad. Beratungs-Projekt für die Führungsteam-Entwicklung.',
    warnhinweis: 'Standardformate wirken hier schnell unterfordernd. Value-Frage besonders sauber führen – dieser Kunde zahlt gerne, aber nur für echten Mehrwert.',
  },
  {
    fokus: 'Kunde ist am oberen Ende. Sucht Austausch auf Peer-Ebene, keine Belehrung.',
    formatvorschlag: 'Monatsgruppe, Bedingung: mindestens zwei bis drei weitere Mitglieder auf ähnlichem Reifegrad. Geschäftsführer-Kreis, wenn die Firma über 100 MA hat.',
    warnhinweis: 'Der Score kann bei dieser Gruppe artifiziell hoch sein (Selbstbild). Im Gespräch prüfen: Ist der Score echt oder ist da noch ein blinder Fleck?',
  },
];
