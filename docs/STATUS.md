# Stand

Stand: 29.10.2026 (Session 1, Fabrice)

## Live

Nichts. Der Shop läuft nur lokal im Cloud-Container. Repo `sundsoffice-tech/trifuse-shop` existiert noch
nicht; der Stand liegt als Bundle bei Fabrice und auf dem lokalen Branch `claude/online-shop-product-listing-l9z787`.

## Fertig und geprüft

- Shop, Händlerportal, Verwaltung, Kasse (Stripe oder Testkasse), Auszahlungen je Händler, Headless-API,
  Seed mit Demo-Daten, Dockerfile und Compose.
- Prüfkette grün: Lint, TypeScript, 4 Unit-Tests, Build, Smoke-Test mit 27 Prüfungen, Screenshots angesehen.

## Offen, nach Dringlichkeit

1. Repo anlegen und pushen (nur Fabrice kann das Repo anlegen).
2. Markenname festlegen (`NEXT_PUBLIC_BRAND_NAME`).
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
