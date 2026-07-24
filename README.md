# TRUST Unternehmer-Score

Reifegrad-Test für Mittelstands-Unternehmer. Erfasst über 40 verhaltensbasierte Fragen (Likert-Skala) die dominante Entwicklungsstufe auf einer fünfstufigen Treppe, generiert client-seitig zwei PDFs (Kunde & Coach) und verschickt sie über einen Cloudflare Worker mit Resend.

Architektur analog zum TRUST Unternehmer-Profil.

## Aufbau des Pakets

```
trust-unternehmer-score/
├── index.html         Frontend (Test-Ablauf + Ergebnisseite)
├── files/
│   ├── data.js        Content-Datenbank (40 Fragen, 5 Stufen, Textbausteine)
│   ├── test.js        Test-Logik und Score-Berechnung
│   └── pdf.js         Client-seitige PDF-Generierung (pdfmake)
├── worker/
│   ├── worker.js      Cloudflare Worker (Resend-Anbindung)
│   └── wrangler.toml  Worker-Konfiguration
├── bilder/            Logos (analog zum Profil-Ordner)
└── README.md          Diese Datei
```

## Wie es zusammen läuft

1. Kunde öffnet die HTML-Seite (statisch, ausgeliefert über Vercel).
2. Kunde durchläuft den Test (40 Fragen → Lead-Formular).
3. Client generiert lokal beide PDFs (Kunde + Coach) mit `pdfmake`.
4. Client sendet PDFs + Kontaktdaten per POST an den Cloudflare Worker.
5. Worker ruft Resend API zweimal auf: Kunden-Mail mit PDF-Anhang, Coach-Mail mit PDF-Anhang und Summary.

## Migration vom alten Score

Der alte Score liegt in einem separaten Repository (`Branne007/unternehmer-score`) und verwendet Formspree + Encharge im Frontend-Code. Der neue Score ersetzt beides durch die Profil-Architektur (pdfmake + Cloudflare Worker + Resend).

### Schritt 1 · Altes Repo auf GitHub umbenennen

- Auf GitHub zu `Branne007/unternehmer-score` gehen
- Settings → General → Repository name → `trust-unternehmer-score` → Rename
- GitHub setzt automatisch einen Redirect

### Schritt 2 · Neues Repo lokal auschecken und Inhalte ersetzen

Alten lokalen Ordner umbenennen und Inhalt komplett ersetzen:

```bash
cd C:\Benutzer\thb\Projekte
# Ordner umbenennen
ren unternehmer-score trust-unternehmer-score
cd trust-unternehmer-score

# Alte Inhalte weg (bilder-Ordner und .git behalten!)
# Manuell im Explorer:
#   - index.html löschen
#   - Anpassungen.docx löschen (oder verschieben)
#   - alle CSS-Dateien löschen (bisher inline im HTML)

# Neue Dateien aus dem Paket übernehmen (dieses README-Ordner reinkopieren,
# aber .git behalten)
```

Alternativ, wenn du sauber starten willst:

```bash
# Alten Ordner sichern
mv unternehmer-score unternehmer-score_alt
# Neues Repo klonen (nach GitHub-Umbenennung)
git clone https://github.com/Branne007/trust-unternehmer-score.git
cd trust-unternehmer-score
# Neue Dateien einfügen (Inhalte dieses Pakets)
```

### Schritt 3 · Ionos-Aliase einrichten (parallel)

Falls noch nicht geschehen: Bei Ionos den Alias `score@trust-unternehmer.de` als Weiterleitung auf `tb@trust-unternehmer.de` anlegen. Ohne diesen Alias funktioniert der Versand trotzdem, aber Kunden-Antworten auf die Absender-Adresse landen im Nichts.

### Schritt 4 · Resend prüfen

- Bei https://resend.com anmelden
- Domain `trust-unternehmer.de` ist bereits verifiziert (vom Profil)
- Kein neuer API-Key nötig – der bestehende funktioniert auch für den Score-Worker
- Absender `score@trust-unternehmer.de` funktioniert automatisch, weil die Domain verifiziert ist

### Schritt 5 · Cloudflare Worker deployen

Im Terminal:

```bash
cd trust-unternehmer-score/worker
wrangler deploy
```

Beim ersten Deploy bekommt der Worker eine URL wie:
```
https://score-mail.<dein-account>.workers.dev
```
(Dein Account ist vermutlich `thb-ad8`, analog zum Profil.)

### Schritt 6 · Resend-Secret setzen

```bash
wrangler secret put RESEND_API_KEY
# Prompt: Bestehenden Resend API-Key einfügen und mit Enter bestätigen
```

Es kann derselbe API-Key verwendet werden wie beim Profil.

### Schritt 7 · Worker-URL im Frontend eintragen

In `index.html` (oben im `<head>`) die Zeile anpassen:

```js
window.SCORE_CONFIG = {
  workerUrl: 'https://score-mail.<dein-account>.workers.dev',
};
```

Ersetze `<dein-account>` durch den tatsächlichen Account-Namen (vermutlich `thb-ad8`).

### Schritt 8 · Vercel-Projekt umbenennen

- Vercel Dashboard → Projekt `unternehmer-score-o4wd` öffnen
- Settings → General → Name → `trust-unternehmer-score` → Save
- Domains → alte Subdomain `unternehmer-score.trust-unternehmer.de` entfernen oder als Redirect belassen
- Add Domain → `score.trust-unternehmer.de` hinzufügen

### Schritt 9 · Cloudflare DNS umstellen

- Cloudflare Dashboard → `trust-unternehmer.de` → DNS
- CNAME `unternehmer-score` bleibt bestehen (als Backup) oder wird gelöscht
- CNAME `score` neu anlegen, Ziel: die neue Vercel-Domain (z. B. `cname.vercel-dns.com`)
- Proxied: an

### Schritt 10 · Push nach GitHub

```bash
cd trust-unternehmer-score
git add .
git commit -m "TRUST Unternehmer-Score v2 – pdfmake + Cloudflare Worker + Resend"
git push
```

Vercel triggert automatisch ein neues Deployment.

### Schritt 11 · Test-Durchlauf

- `score.trust-unternehmer.de` im Browser öffnen
- Score mit Test-Daten durchlaufen
- Prüfen:
  - Bestätigungsseite zeigt „PDF ist unterwegs"
  - Kunde bekommt Mail mit PDF-Anhang
  - Du bekommst Coach-Mail mit Coach-PDF (inklusive Coach-Hinweise und Rohdaten)

## Test lokal öffnen

Einfach `index.html` im Browser öffnen. Der Test läuft. Der Mail-Versand wird fehlschlagen (kein Worker erreichbar), stattdessen bekommt der Kunde einen PDF-Download-Fallback angeboten.

Für lokale Entwicklung mit Worker:

```bash
cd worker
wrangler dev
# Worker läuft auf http://localhost:8787
```

Und `window.SCORE_CONFIG.workerUrl` in `index.html` temporär auf `http://localhost:8787` setzen.

## Konfiguration

### Coach-Adresse und Absender ändern
In `worker/wrangler.toml`:

```toml
[vars]
COACH_EMAIL = "tb@trust-unternehmer.de"
FROM_ADDRESS = "TRUST Unternehmer <score@trust-unternehmer.de>"
```

Nach Änderung: `wrangler deploy` erneut ausführen.

### CORS einschränken (optional, Production)

Aktuell erlaubt der Worker alle Origins (`Access-Control-Allow-Origin: *`). Für Production strenger:

```js
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://score.trust-unternehmer.de',
  // ...
};
```

## Wartung und Anpassungen

- **Fragen ändern:** in `files/data.js` bei `QUESTIONS`
- **Stufen-Kernaussage oder Schritte ändern:** in `files/data.js` bei `STUFEN_KERNAUSSAGE` bzw. `STUFEN_SCHRITTE`
- **Coach-Hinweise ändern:** in `files/data.js` bei `COACH_HINWEISE`
- **PDF-Layout anpassen:** in `files/pdf.js`
- **Design (Website) ändern:** im `<style>`-Block in `index.html`

## Besonderheit: Metadaten-Zeile für den Klarheits-Kompass

Am Ende des Coach-PDF steht eine sehr kleine, weiße Textzeile (nicht auffällig im Ausdruck), die alle Score-Werte in maschinenlesbarer Form enthält:

```
TRUSTSCORE_META|ov:73|dom:1|str:1|wk:0|p:35,68,52,41,29|em:8.5|ans:34322...|lead:...|firma:...|email:...|end
```

Diese Zeile wird vom TRUST Klarheits-Kompass (separates Tool) beim PDF-Upload automatisch geparst. Damit kann Thomas ein Coach-PDF direkt in den Kompass hochladen, ohne die Score-Daten manuell einzutragen.

## Kosten

- Cloudflare Workers Free Plan: 100.000 Requests/Tag
- Resend Free Plan: 100 Mails/Tag, 3.000 Mails/Monat
- Vercel Hobby Plan: kostenlos für statische Sites
- Domain: bereits vorhanden

Effektive laufende Kosten: 0 €/Monat.

## Encharge-Anbindung (später)

Der Score läuft aktuell ohne Encharge-Anbindung, weil das im Strategiepapier v10 vorgesehene Trichter-System noch nicht aktiv ist. Wenn du Encharge später anbindest, ist der Umbau minimal: Im Worker-Code (`worker/worker.js`) einen zusätzlichen `fetch`-Call an die Encharge-API einfügen. Rund 15 Minuten Aufwand.

## Cross-Referenz zum Unternehmer-Profil

Der Score ist am Ende auf das TRUST Unternehmer-Profil verlinkt (`profil.trust-unternehmer.de`). Umgekehrt verlinkt das Profil auf den Score. Damit entsteht die geplante Zwei-Tool-Sequenz für Coaching-Kunden: erst Score (strukturelle Perspektive), dann Profil (persönliche Perspektive).

---

**© 2026 TB UnternehmerImpulse eG · trust-unternehmer.de**
