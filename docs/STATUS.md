# Stand

Stand: 29.10.2026, abends (Session 1, Fabrice)

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

- Shop, Händlerportal, Verwaltung, Kasse (Stripe oder Testkasse), Auszahlungen je Händler, Headless-API,
  Seed mit Demo-Daten, Dockerfile und Compose.
- Prüfkette grün: Lint, TypeScript, 4 Unit-Tests, Build, Smoke-Test mit 27 Prüfungen, Screenshots angesehen.

## Offen, nach Dringlichkeit

1. Auf sunds-hub ausrollen: `bash ops/sunds-hub/ausrollen.sh` vom PC (Anleitung `ops/sunds-hub/README.md`), DNS bei Strato setzen.
2. Echte Fotos von Machern und Produkten; bis dahin Platzhalter „Foto folgt“.
3. Kundendienst-Adresse service@trifuse.store einrichten (steht auf Bestellbestätigung und in der Fußzeile).
4. Entscheiden, ob der Shop ein eigenes Repo bekommt (`trifuse-shop`) oder im Branch bleibt.
3. Impressum, Datenschutz, AGB, Widerruf: Platzhalter füllen, juristisch prüfen.
4. Stripe-Schlüssel und Webhook einrichten, einmal echten Testkauf im Stripe-Testmodus durchführen.
5. Bestellbestätigung und Händler-Benachrichtigung per Mail (Versandweg des Hauses, kein eigener SMTP).
6. Docker-Build auf einem Server mit Daemon prüfen.
7. Rate-Limit für Login und Bewerbung (siehe `docs/SKALIERUNG.md`, Stufe 2).

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
