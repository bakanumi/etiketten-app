# Etiketten-Generator

Webbasierte App zum Erstellen von Etiketten für Zebra-Thermodrucker aus
CSV- oder Textlisten: frei skalierbare Etikettengröße, wählbare Schriftart
und -größe, QR-Codes, mehrzeiliger Text mit Platzhaltern (`{{Spalte}}`) und
freier Positionierung/Ausrichtung der Elemente.

Gedruckt wird über den normalen Browser-Druckdialog auf dem PC, auf dem der
Zebra-Windows-Treiber installiert ist (Geschwindigkeit, Dichte etc. kommen
aus den Treiber-Einstellungen). Alternativ lässt sich derselbe Entwurf als
PDF herunterladen (ein Etikett pro Seite, exakte physische Seitengröße).

Kein Login, keine Datenbank – Daten und Etiketten-Design werden lokal im
Browser (`localStorage`) gespeichert.

## Tech-Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (Base UI)
- PapaParse (CSV/Text-Import), `qrcode` (QR-Codes)
- `@react-pdf/renderer` für den PDF-Export
- Selbst gehostete, offen lizenzierte Fonts (Fira Sans, IBM Plex Sans
  Condensed, IBM Plex Mono, Barlow Condensed) unter `public/fonts/`

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Läuft auf [http://localhost:3001](http://localhost:3001) (Port 3001, damit
es parallel zu anderen Next.js-Apps auf demselben Rechner laufen kann).

Unter Windows kann alternativ `dev.cmd` per Doppelklick gestartet werden.

## Deployment (Self-Hosting)

```bash
npm run build
npm run start
```

Läuft dann ebenfalls auf Port 3001. Kein Datenbank- oder Auth-Setup nötig.

Die App hat keinen eigenen Login und legt gespeicherte Vorlagen in `data/templates.json`
ab (Ordner per `ETIKETTEN_DATA_DIR` änderbar). Für den Betrieb hinter einer eigenen
Domain mit SSL siehe [deploy/DEPLOY.md](deploy/DEPLOY.md) (systemd + nginx + Let's Encrypt).
