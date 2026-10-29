# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Privatkunden, die Geschenke und Besonderes suchen. Sie kaufen überwiegend abends am Handy, wollen die
Geschichte hinter Marke und Produkt kennen und zahlen für Qualität (Fabrice, 29.10.2026). Zweite Gruppe:
kleine Hersteller als Händler, die ihre Produkte selbst einstellen und ihre Auszahlungen verfolgen.

## Product Purpose
Ein Marktplatz, auf dem kleine Hersteller ihre Produkte listen und Endkunden sie mit einer Kasse und in einem
Paket kaufen. Betreiber ist trifuse (Shop, Lager, Versand, Service). Erfolg: Bestellungen über mehrere Händler,
Händler, die ihre Produkte selbst pflegen, und Auszahlungen, die ohne Nachrechnen stimmen.

## Positioning
„Direkt vom Macher, fair ausgezahlt.“ Jede verkaufte Position wird dem Hersteller einzeln gutgeschrieben; der
Hersteller bekommt sichtbar den größten Teil des Preises, der Käufer unterstützt Menschen, nicht einen Konzern.
Die Transparenz der Abrechnung ist Teil der Marke, nicht nur Technik (Fabrice, 29.10.2026).

## Operating Context
Kunde: Produktseite, Warenkorb über mehrere Händler, Kasse (Stripe), Bestellbestätigung. Händler: Portal mit
Produkten, Verkäufen je Position (Brutto, Provision, Anteil), Auszahlungen, Profil. Team: Verwaltung mit Freigabe,
Händlern, Bestellungen, Auszahlungsabrechnungen. Versand aus dem trifuse-Lager oder durch den Händler.

## Capabilities and Constraints
Next.js 16, Prisma, eigene Commerce-Module (Eigenbau, kein fremdes Commerce-Backend). Produkte tragen Titel,
Beschreibung, bis zu acht Bilder, Preis, Streichpreis, Bestand, Kategorie, Versandweg. Preise brutto in Euro.
Deutsch, echte Umlaute. Hausregeln: `dossier` (Verbotsliste gegen den KI-Look, harte Regeln für
Landingpages), `hinsehen` vor jedem Commit. Offen: Transaktionsmails, Rechtstexte, Stripe-Schlüssel.

## Brand Commitments
Name und Domain: **trifuse.store** (Domain gekauft, Fabrice 29.10.2026). Der Shop ist damit die Endkunden-Marke
von trifuse, erkennbar verwandt mit trifuse.de (Dienstleister für Hersteller), aber mit eigenem Auftritt für
Käufer. Erkennbare Züge der Muttermarke sind zu wahren, der Shop darf ihre Welt für Endkunden erweitern.

## Evidence on Hand
Drei Demo-Händler und zehn Demo-Produkte mit Platzhalter-Grafiken (`prisma/seed.mjs`, `public/demo/`). Keine
echten Hersteller, keine echten Produktfotos, keine Kundenstimmen. Nichts davon erfinden; Platzhalter als solche
kennzeichnen. Muttermarke: `trifuse-vorschau` (Startseite mit 3D-Partikelwelt, Texte, Team).

## Product Principles
1. Der Hersteller ist sichtbar: Name, Gesicht, Herkunft, Anteil am Preis.
2. Ein Paket, eine Kasse, ein Ansprechpartner; der Komfort eines großen Shops, die Nähe eines Marktes.
3. Zahlen sind belegt: Provision und Anteil stehen auf jeder Position, nicht in einer Fußnote.
4. Abends am Handy muss alles mit einer Hand gehen; Lesbarkeit vor Dichte.
5. Nichts, was nach Katalog oder Konzern aussieht; nichts Erfundenes als echt ausgeben.
