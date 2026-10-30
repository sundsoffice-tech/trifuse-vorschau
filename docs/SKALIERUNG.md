# Skalierung: was heute gilt und was wann kommt

Fabrice, 29.10.2026: „denke voraus, skalierbar, überdenke jeden Schritt, validiere.“ Diese Datei ist die
Antwort darauf. Jede Stufe nennt den Auslöser (gemessen, nicht vermutet), die Maßnahme und was dafür schon
vorbereitet ist.

## Stufe 0: heute (ein Server, SQLite, lokale Bilder)

Trägt nach Schätzung bis etwa 20 Händler, 2.000 Produkte, einige hundert Bestellungen am Tag auf einer
Instanz. Was dafür schon eingebaut ist:

- Geschäftslogik in Modulen, Seiten sind dünn. Ein API-Backend oder zweites Frontend kann die Module
  direkt nutzen (`/api/v1` zeigt den Weg).
- Datenmodell datenbankneutral, Indizes auf den Hauptabfragen (`Product(vendorId,status)`,
  `Product(categoryId,status)`, `OrderItem(vendorId,payoutId)`, `OrderItem(orderId)`).
- Geld in Cent, Provision je Position eingefroren: Auszahlungen bleiben auch bei Änderungen am Satz korrekt.
- Zahlung, Bildablage und Mailversand hinter Schnittstellen; Mails laufen über einen Postausgang in der
  Datenbank, den mehrere Instanzen gefahrlos gemeinsam abarbeiten (Beanspruchen per Statuswechsel).
- Bilder werden beim Hochladen auf feste Breiten verkleinert (WebP); die Auslieferung ist ein Dateizugriff
  mit einem Jahr Cache, kein Rechnen je Aufruf.
- Bestellnummer mit Retry bei Kollision, Bezahlt-Markierung idempotent (Webhook und Rückleitung können beide
  zuschlagen).
- Listen paginiert (Shop) oder begrenzt (Admin: 200 Zeilen).
- SQLite mit `connection_limit=1` und WAL: gemessen stabil bei 30 gleichzeitigen Käufern auf ein Produkt
  (`docs/STATUS.md`). Der Preis: Schreibzugriffe laufen nacheinander; das ist die Grenze dieser Stufe.

## Stufe 1: Postgres (Auslöser: zweite Instanz oder SQLite-Datei über ~1 GB oder Schreibkonflikte im Log)

- `prisma/schema.prisma`: `provider = "postgresql"`, `DATABASE_URL` setzen, `npx prisma migrate dev`.
- Suche: `contains` wird in Postgres `ILIKE`; ab ~10.000 Produkten auf `tsvector`-Volltext umstellen
  (eigene Migration, Modul `catalog/queries.ts` ist die einzige Stelle).
- Bestellnummer: optional auf eine Postgres-Sequenz umstellen; der Retry bleibt als Netz.

## Stufe 2: mehrere Instanzen (Auslöser: CPU-Last der Instanz dauerhaft > 70 % oder Deploy ohne Ausfall nötig)

- Bilder in S3-kompatiblen Speicher (Hetzner Object Storage, MinIO): zweiter Adapter in
  `src/modules/media/storage.ts` mit derselben Schnittstelle, `imageUrl()` liefert dann die CDN-Adresse.
- Sessions und Warenkorb liegen schon in der Datenbank, nicht im Prozess. Nichts zu tun.
- Rate-Limit für Login und Bewerbungsformular: heute keins. Vor Stufe 2 in Redis oder Postgres anlegen
  (Tabelle `LoginAttempt`), damit es instanzübergreifend zählt.
- Aufräumen offener Bestellungen und künftige Mails in einen Job auslagern (Cron-Route mit Secret oder
  eigener Worker), statt beim Laden der Admin-Übersicht.

## Stufe 3: Last im Katalog (Auslöser: > 50 Anfragen/s auf Katalogseiten)

- Katalogseiten über `unstable_cache` mit Tags (`product:<id>`, `vendor:<id>`, `catalog`) cachen und in den
  Aktionen gezielt invalidieren. Warenkorb-Zähler im Header dann als Client-Komponente, damit die Seite
  selbst cachebar bleibt.
- Bildvarianten (Thumbnails, WebP) beim Upload erzeugen, nicht beim Ausliefern.
- Erst dann Cache Components erwägen; vorher ist es nur Komplexität.

## Stufe 4: Geschäftsmodell wächst

- Stripe Connect je Händler: neuer Provider, OrderItem trägt schon alles, was ein Transfer braucht.
- Mehrere Lager, händlerabhängiger Versand: `shippingBy` je Produkt ist da; Versandregeln als eigenes Modul.
- Rechnungen: Übergabe an das Rechnungsprogramm des Hauses über die Schnittstelle in
  `leadmaschine/zentrale/rechnungen/SCHNITTSTELLE-BUCHHALTUNG.md` statt eigener Rechnungslogik.
- Mehrsprachigkeit: alle sichtbaren Texte sind heute im Code; vor dem ersten zweiten Markt in Textdateien ziehen.

## Was bewusst nicht gebaut wurde

- Kein Microservice-Schnitt, keine Queue, kein Redis: nichts davon ist heute messbar nötig, alles davon
  kostet Betrieb. Die Schnittstellen sind so geschnitten, dass es nachgezogen werden kann.
- Keine Volltextsuche, kein Elasticsearch: `contains` reicht für die ersten tausend Produkte.

## Validierung je Stufe

Jede Stufe gilt erst als erledigt, wenn die Prüfkette aus `CLAUDE.md` grün ist, der Smoke-Test gegen die
neue Infrastruktur läuft und die Kennzahl, die den Auslöser gebildet hat, nachweislich besser ist.
