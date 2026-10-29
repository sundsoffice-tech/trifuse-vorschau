# trifuse-shop: Marktplatz für kleine Marken

Eigenständiger Online-Marktplatz (eigene Marke, betrieben von trifuse), auf dem kleine Hersteller ihre Produkte
listen. Eine Kasse für alle Händler, jede bezahlte Position wird dem Händler einzeln gutgeschrieben, Auszahlungen
werden gebündelt und nachvollziehbar abgerechnet. Kompletter Eigenbau nach dem Vorbild von Medusa: modulare
Commerce-Logik (`src/modules/`) plus Storefront, Händlerportal und Verwaltung in einer Next.js-App.

## Was drin ist

| Bereich | Weg | Inhalt |
|---|---|---|
| Shop | `/`, `/produkte`, `/produkt/[slug]`, `/haendler`, `/warenkorb`, `/kasse` | Katalog mit Suche, Kategorien, Sortierung; Warenkorb über mehrere Händler; Kasse mit Stripe Checkout (oder Testkasse) |
| Händlerportal | `/portal` | Produkte anlegen und pflegen (Bilder, Preis, Bestand), Verkäufe je Position mit Provision und eigenem Anteil, Auszahlungen, Markenprofil und Bankverbindung |
| Verwaltung | `/admin` | Freigabe-Warteschlange, Produkte für Händler einpflegen, Händler anlegen und konfigurieren (Provision, Selbst-Veröffentlichung, Status), Bestellungen mit Versandstatus je Position, Auszahlungen erstellen und abhaken, Kategorien, Einstellungen |
| Bewerbung | `/verkaufen` | Hersteller bewerben sich selbst; das Team schaltet frei |
| API (headless) | `/api/v1/products`, `/api/v1/products/[slug]`, `/api/v1/vendors`, `/api/health` | Lesende JSON-Schnittstelle für andere Frontends |
| Webhook | `/api/webhooks/stripe` | Zahlungsbestätigung von Stripe |

### Geldfluss und Auszahlung

1. Kunde bezahlt einmal an den Marktplatz (Stripe Checkout).
2. Jede Bestellposition (`OrderItem`) friert ein: Händler, Preis, Menge, Provisionssatz, Provision in Cent, Händleranteil in Cent.
3. Unter `/admin/auszahlungen` steht je Händler das offene Guthaben (alle bezahlten Positionen ohne Auszahlung).
   „Auszahlung erstellen“ bündelt sie zu einer Abrechnung mit Positionsliste (druckbar).
4. Nach der Überweisung wird die Auszahlung mit Referenz als bezahlt markiert. Der Händler sieht das in seinem Portal.

Provision: Standardsatz unter Einstellungen, je Händler überschreibbar. Rundung kaufmännisch je Position, Händleranteil ist der Rest, sodass die Summe immer aufgeht (Test in `test/money.test.mjs`).

### Produktfreigabe

- Händler legen Produkte an und reichen sie ein (`PENDING`). Das Team gibt frei oder lehnt mit Begründung ab.
- Händler mit „darf selbst veröffentlichen“ gehen direkt live.
- Das Team kann Produkte für jeden Händler direkt anlegen und veröffentlichen.

## Starten

```bash
npm install
cp .env.example .env          # Werte anpassen, mindestens ADMIN_EMAIL und ADMIN_PASSWORD
npx prisma migrate deploy     # Datenbank anlegen (SQLite unter data/shop.db)
npm run db:seed               # Admin anlegen; bei leerer DB zusätzlich Demo-Händler und Demo-Produkte
npm run dev                   # http://localhost:3000
```

Demo-Zugänge nach dem Seed: Admin aus `.env`; Händler `wiesenkram@example.com`, `lichtwerk@example.com`,
`tonundtisch@example.com`, Passwort `haendler-demo-2026`. Ohne Demo-Daten: `SEED_DEMO=0 npm run db:seed`.

Im Standard läuft die Kasse im **Testmodus** (`PAYMENTS_MODE=test`): statt Stripe erscheint eine Seite
„Zahlung simulieren“. Für echte Zahlungen `PAYMENTS_MODE=stripe`, `STRIPE_SECRET_KEY` und
`STRIPE_WEBHOOK_SECRET` setzen und den Webhook auf `https://<domain>/api/webhooks/stripe` zeigen lassen
(Ereignis `checkout.session.completed`).

## Prüfen

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Unit-Tests (Geld, Slugs, Statuslogik)
npm run build       # Produktions-Build
npm start           # dann in zweitem Terminal:
npm run test:smoke  # Browser-Durchlauf: Seiten hell/dunkel, Kauf, Händlerportal, Admin-Freigabe, Auszahlung, API
```

Der Smoke-Test braucht Playwright (`npm i -D playwright && npx playwright install chromium` oder eine globale
Installation) und schreibt Screenshots nach `test/ergebnisse/`.

## Betrieb mit Docker

```bash
cp .env.example .env   # anpassen
docker compose up -d --build
```

Der Container führt beim Start Migrationen und den Seed (idempotent) aus. Datenbank und Bilder liegen im
Volume `shop-data` (`/app/data`). Hinter einen Reverse-Proxy mit TLS stellen und `APP_URL` auf die öffentliche
Adresse setzen.

Wechsel auf Postgres: in `prisma/schema.prisma` den Provider auf `postgresql` stellen, `DATABASE_URL` anpassen,
`npx prisma migrate dev --name postgres`. Das Datenmodell ist datenbankneutral.

## Struktur

```
prisma/schema.prisma          Datenmodell (User, Vendor, Product, Cart, Order, OrderItem, Payout, Setting)
prisma/seed.mjs               Startdaten
src/modules/auth              Sitzungen (Cookie + DB), Login, Rollen ADMIN / VENDOR
src/modules/catalog           Katalogabfragen, Produktservice, Aktionen für Händler und Admin
src/modules/cart              Warenkorb (Cookie-Token + DB)
src/modules/orders            Bestellung aus Warenkorb, Bezahlt-Markierung, Storno, Aufräumen
src/modules/payments          Provider-Schnittstelle: Stripe und Testkasse
src/modules/payouts           Offene Guthaben, Auszahlungsentwürfe, Abrechnung
src/modules/vendors           Händler anlegen, Bewerbung, Profil
src/modules/media             Bild-Upload mit Formatprüfung, Auslieferung über /api/media
src/app/(shop)                Storefront
src/app/portal                Händlerportal
src/app/admin                 Verwaltung
src/app/api                   Medien, Webhook, headless API
src/lib                       Geld, Slugs, Passwörter (scrypt), Einstellungen, Formulare
test/                         Unit-Tests und Browser-Durchlauf
```

## Offen vor dem Start

- Markenname und Rechtstexte: `NEXT_PUBLIC_BRAND_NAME` setzen, Platzhalter in Impressum, Datenschutz, AGB und
  Widerruf (`src/components/shop/legal-page.tsx`) füllen und juristisch prüfen lassen.
- Transaktionsmails (Bestellbestätigung, Händler-Benachrichtigung): noch nicht angebunden.
  Stripe verschickt auf Wunsch eine eigene Zahlungsbestätigung.
- Versandkosten sind eine Pauschale mit Freigrenze; gewichts- oder händlerabhängige Regeln fehlen bewusst noch.
- Steuer: Preise sind Bruttopreise, Rechnungsstellung läuft außerhalb (bei Bedarf Anbindung an das Rechnungsprogramm des Hauses).
