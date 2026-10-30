# Stand

Stand: 30.10.2026 (Session 2, Fabrice)

## Live

Nichts. Der Code liegt auf Fabrices Anweisung (29.10.2026) als eigener Branch
`claude/online-shop-product-listing-l9z787` im Repo `sundsoffice-tech/trifuse-vorschau`, mit eigener
Historie ohne Bezug zur statischen Vorschau auf `main`. Ein eigenes Repo `trifuse-shop` kann später per
`git push` dieses Branches entstehen; bis dahin niemals diesen Branch in `main` von trifuse-vorschau mergen
(dort ist `main` ein GitHub-Pages-Deploy).

## Fertig und geprüft

- **Marke und Gestaltung (29.10.2026, abends):** trifuse.store, Standardweg in voller Qualität nach `DESIGN.md`.
  Alle 58 Künstler-Funde (`docs/KUENSTLER-2026-10-29.md`) eingearbeitet: Macheranteil an jedem Produkt,
  Warenkorb nach Kauf leer, Versandkosten am Produkt, Suche am Handy, Plus/Minus im Warenkorb, Kasse ohne
  Haken, Bewerbung ohne Passwort, Auszahlung ohne IBAN gesperrt, Auszahlungstermin sichtbar, deutsche
  Foto-Auswahl, ein Wort „Macher“, Umbrüche und Kontraste, Seitenleiste durchgehend, Grammatik in Zahlen.
  Nicht lösbar ohne Fabrice: echte Produktfotos (Platzhalter sagen jetzt „Foto folgt“).
- **Zweiter Künstler-Durchgang** (`docs/KUENSTLER-2026-10-29-zweiter-durchgang.md`): 37 von 58 behoben, 16 teilweise,
  22 neue Funde. Davon eingearbeitet: Tabellen passen ins Fenster, Grußkarte und Hinweis getrennt, Kaufknopf am
  Handy im ersten Bildschirm, Handy-Kopf ohne „Anmelden“, Art als Pflichtfeld, IBAN in Vierergruppen,
  Verwendungszweck vorausgefüllt und Pflicht, Auszahlungstermin als Datum, „aus Wegberg“ statt „aus Niederrhein“,
  ein Ort-Feld, Rückgabe-Satz einheitlich und bei Lebensmitteln ehrlich, Fußzeilen-Links 44 px, Komponenten-CSS
  in Tailwind-Ebene (vorher schlugen Klassen wie `hidden` fehl). Offen und bewusst: Zahlarten in der Kasse erst mit
  Stripe sichtbar, Foto-Reihenfolge erst nach dem Speichern, Telefonnummer im Kundendienst, Gesichter der Macher.

- Shop, Händlerportal, Verwaltung, Kasse (Stripe oder Testkasse), Auszahlungen je Händler, Headless-API,
  Seed mit Demo-Daten, Dockerfile und Compose.
- Prüfkette grün: Lint, TypeScript, 4 Unit-Tests, Build, Smoke-Test mit 27 Prüfungen, Screenshots angesehen.

- **impeccable audit, harden, onboard (29.10.2026, spät):** 17 von 20 im Audit, 25 Randzustände als Bilder geprüft,
  Macher-Erstlauf von der Bewerbung bis zum eingereichten Produkt in sieben Bildschirmen. Bericht
  `docs/PRUEFUNG-2026-10-29.md`, Werkzeug `npm run test:pruefung` (räumt seine Testdaten selbst auf).

- **Rückbuchungen und Webhook-Härtung (30.10.2026):** Rückgabe, Erstattung und Kulanz je Position mit
  Teilmengen, Bestand zurück, Rückzahlung über die Provider-Schnittstelle (Stripe `refunds.create` mit
  Idempotenz-Schlüssel, Testkasse simuliert), Verrechnung in Auszahlungen (negativer Saldo wird vorgetragen,
  Saldo null wird verrechnet), Macher sehen Rückgaben bei Verkauf und Auszahlung. Webhook mit Dubletten-Schutz
  und vier weiteren Ereignissen. Geprüft: 6 Unit-Tests, `npm run test:webhook` (12 Prüfungen offline),
  Smoke-Test um Rückgabe nach Auszahlung erweitert (33 Prüfungen), Bilder angesehen.

- **Mail-Modul (30.10.2026):** Postausgang in der Datenbank, Transport SMTP/Datei/aus, zehn Vorlagen
  (Bestellbestätigung, Verkaufsmeldung je Macher, Bewerbung an Bewerber und Team, Willkommen mit
  Passwort-Link, Passwort vergessen, Produkt freigegeben/abgelehnt, Auszahlung überwiesen, Erstattung),
  Admin-Seite `/admin/postausgang` mit erneutem Senden, „Passwort vergessen“ für Macher und Team.
  Geprüft: 3 Unit-Tests für Vorlagen, Smoke-Test prüft Postausgang und den kompletten Passwort-Weg über
  die Datei-Mail (42 Prüfungen).

- **Grundpreis (30.10.2026):** Inhalt (Menge, Einheit) am Produkt, Grundpreis auf Karte, Produktseite, im
  Warenkorb und in der API, Formular mit Live-Vorschau. `npm run db:fresh` setzt die lokale Datenbank samt
  Demo-Daten neu auf (nur SQLite, nie Produktion).

- **Bilder (30.10.2026):** Upload erzeugt WebP in 320/640/1280 px plus Master bis 2000 px, `Picture`-Komponente mit
  srcset überall, API liefert die Varianten. Gemessen im Smoke-Test: 2400 × 1800 JPEG mit 3 MB wird zu 3 KB
  Kartenbild. Ältere Uploads mit Endung bleiben lesbar.

- **SEPA und Buchhaltung (30.10.2026):** Sammelüberweisung pain.001.001.09 für alle Entwürfe (Konto unter
  Einstellungen), Schutz vor Doppelexport, CSV je Position und je Auszahlung, IBAN-Prüfziffer bei Machern und
  im Admin. Geprüft: 4 Unit-Tests (IBAN, Zeichensatz, XML mit xmllint, CSV), Smoke-Test lädt Datei und CSV.
  Nicht geprüft: Annahme der Datei durch eine echte Bank; dafür einmal im Online-Banking hochladen (Entwurf, nicht freigeben).

- **Sicherung (30.10.2026):** `npm run db:backup` (VACUUM INTO, Integritätsprüfung, 14 Stände, Bildarchiv mit
  `--mit-bildern`), `npm run db:restore <datei>` mit Sperrprüfung, zwei systemd-Timer in `server-einrichten.sh`.
  Geprüft: `npm run test:sicherung` (Sicherung im Betrieb, Zählwerte, Aufräumen, Wiederherstellung, Sperre).

## Offen, nach Dringlichkeit

1. Auf sunds-hub ausrollen: `bash ops/sunds-hub/ausrollen.sh` vom PC (Anleitung `ops/sunds-hub/README.md`), DNS bei Strato setzen.
2. Echte Fotos von Machern und Produkten; bis dahin Platzhalter „Foto folgt“.
3. Kundendienst-Adresse service@trifuse.store einrichten (steht auf Bestellbestätigung und in der Fußzeile).
4. Entscheiden, ob der Shop ein eigenes Repo bekommt (`trifuse-shop`) oder im Branch bleibt.
3. Impressum, Datenschutz, AGB, Widerruf: Platzhalter füllen, juristisch prüfen.
4. Stripe-Schlüssel und Webhook einrichten (Ereignisse siehe `.env.example`), einmal echten Testkauf und eine Erstattung im Stripe-Testmodus durchführen.
5. SMTP-Zugang des Hauses in `.env` eintragen (`MAIL_MODE=smtp`, `SMTP_*`, `MAIL_FROM`) und eine echte Mail über `/admin/postausgang` prüfen; bis dahin bleibt der Dateimodus.
6. Docker-Build auf einem Server mit Daemon prüfen.
7. Rate-Limit für Login und Bewerbung (siehe `docs/SKALIERUNG.md`, Stufe 2).
8. Schnittstelle zur Hausbuchhaltung (sunds-buchhaltung) auf Basis des CSV-Exports, nach dem Rollout; Vertrag in `leadmaschine/zentrale/rechnungen/SCHNITTSTELLE-BUCHHALTUNG.md`.

## Gemessen

- **Parallele Käufe, 29.10.2026** (`npm run test:parallel`, Produktionsbuild, SQLite, eine Instanz):
  - Erster Lauf ohne Tuning: 12 Käufer auf Bestand 4 → 4 bezahlt, 8 abgewiesen, kein Überverkauf. 10 Käufer
    auf Bestand 6 → 5 bezahlt, **eine Transaktion lief in den Prisma-Standard-Timeout (5 s), die rohe
    Prisma-Meldung stand beim Kunden**. 20 Käufer → Socket-Timeouts der SQLite-Verbindung, 12 Kunden sahen
    einen Fehler (inzwischen maskiert), Bestand blieb trotzdem korrekt.
  - Nach `connection_limit=1`, WAL-Modus, Transaktions-Timeout 20 s und Wiederholung bei P2002/P2028:
    20 Käufer auf Bestand 5 → 5 bezahlt, 15 fachlich abgewiesen; 30 Käufer auf Bestand 6 → 6 bezahlt, 24
    abgewiesen. Keine Timeouts, kein Eintrag im Serverlog, Bestand danach 0.
  - Belegstufe: belegt (lokal, eine Instanz). Die Grenze darüber ist nicht gemessen; ab dort gilt
    `docs/SKALIERUNG.md`, Stufe 1 (Postgres).

## Zu prüfen (Vermutungen, keine Belege)

- Verhalten mit zwei Instanzen auf einer SQLite-Datei: nicht gemessen und nicht vorgesehen; vorher Postgres
  (siehe `docs/SKALIERUNG.md`, Stufe 1).
