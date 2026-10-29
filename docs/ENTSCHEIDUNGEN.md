# Entscheidungen

Jede Zeile: Datum, Entscheidung, Grund, verworfene Alternative. Nichts hier wird gelöscht, nur ergänzt.

| Datum | Entscheidung | Grund | Verworfen |
|---|---|---|---|
| 29.10.2026 | Kompletter Eigenbau nach Medusa-Vorbild (Fabrice) | Kontrolle über Datenmodell, Provision und Auszahlung; kein Vendor-Lock-in; keine Lizenz- oder Plugin-Abhängigkeit | Medusa.js (Postgres+Redis, Plugin-Abhängigkeit), Shopify (Gebühren, Multi-Vendor nur per App) |
| 29.10.2026 | Eigene Marke, getrennt von trifuse (Fabrice) | trifuse ist Dienstleister für Händler; der Marktplatz richtet sich an Endkunden | Shop unter trifuse-Marke |
| 29.10.2026 | Zentrale Kasse, Provision und Händleranteil je Position eingefroren (Fabrice) | Eine Zahlung für den Kunden; Ausschüttung muss später ohne Nachrechnen belegbar sein | Stripe Connect je Händler (Onboarding-Hürde für kleine Hersteller), Listing ohne Kasse |
| 29.10.2026 | Next.js 16 App Router + Prisma + SQLite, Postgres-fähig | Eine App für Shop, Portal und Admin; SQLite startet ohne Infrastruktur, Modell bleibt datenbankneutral | Express+EJS (wie AnlassBox, zu eng für Händlerportal), getrenntes API-Backend (zweiter Deploy ohne Nutzen am Anfang) |
| 29.10.2026 | Cache Components aus | Fast jede Seite liest Cookie (Warenkorb, Session); das neue Modell erzwingt Suspense-Grenzen überall und bringt erst bei statischen Katalogseiten etwas | Cache Components an |
| 29.10.2026 | Sessions in der Datenbank, Cookie trägt nur die ID | Sofortiger Entzug möglich (Händler pausieren), kein Secret-Management für signierte Cookies | JWT/iron-session |
| 29.10.2026 | Passwörter mit scrypt aus node:crypto | Keine native Abhängigkeit, kein Build-Risiko im Container | bcrypt/argon2 (native Module) |
| 29.10.2026 | Bestand wird bei Bestellanlage reserviert, offene Bestellungen verfallen nach 2 h | Kein Überverkauf bei parallelen Käufen; Aufräumen läuft beim Laden der Admin-Übersicht | Abzug erst bei Zahlung |
| 29.10.2026 | Testkasse als eigener Payment-Provider | Vorführung und Tests ohne Stripe-Schlüssel; echter Pfad bleibt identisch bis zur Weiterleitung | Stripe-Testmodus als einziger Weg (braucht Schlüssel und Webhook-Tunnel) |
| 29.10.2026 | Bilder lokal unter `data/uploads`, Auslieferung über `/api/media` | Start ohne Objektspeicher; Adapter-Schnittstelle hält den Weg zu S3 offen | Direkt in `public/` (nicht zur Laufzeit beschreibbar im Standalone-Build) |
| 29.10.2026 | Bestellnummer `M-JJJJ-NNNNNN` fortlaufend mit Wiederholung bei Kollision | Lesbar für Kunden und Buchhaltung; Kollision unter Postgres wird durch Unique-Constraint und Retry abgefangen | Zufalls-IDs (nicht buchhaltungstauglich) |
| 29.10.2026 | Umlaute echt, nicht als ae/oe/ue | Kunden sehen die Texte; ASCII-Schreibweise wirkt wie ein Fehler | ASCII-Schreibweise aus den Haus-CLAUDE.md-Dateien |
| 29.10.2026 | SQLite nur mit `connection_limit=1`, WAL-Modus, Bestell-Transaktion mit 20 s Timeout und Wiederholung bei Kollision oder Ablauf | Messung: ohne diese Einstellungen Socket-Timeouts ab 10 bis 20 gleichzeitigen Käufern (siehe `docs/STATUS.md`) | Prisma-Standard (Pool mit mehreren Verbindungen, 5 s), der bei SQLite nur Sperrkonflikte erzeugt |
| 29.10.2026 | Technische Fehlertexte (Prisma, Stripe) erreichen den Kunden nie, nur fachliche Meldungen | Messung zeigte eine rohe Prisma-Meldung auf der Kassenseite | Alle Fehlertexte durchreichen |
| 29.10.2026 | Marke trifuse.store, Standardweg in voller Qualität, Maßstab Manufactum und Etsy (Fabrice) | Domain gekauft; von drei gebauten eigenen Richtungen (Kassenbon, Packband, Marktschild) keine gewählt, bewährtes Marktplatz-Muster mit trifuse-Farben | Kassenbon (Flaschengrün, Bon als Markenzeichen), Packband (Marine, orangenes Band), Marktschild (Markise, Preisschilder); liegen in `design/richtungen/` |
| 29.10.2026 | Zielgruppe Privatkunden mit Geschenksuche, Versprechen „Direkt vom Macher, fair ausgezahlt“ (Fabrice) | Formt Ton, Bildwelt und die Zeile mit dem Macheranteil an jedem Produkt | Preisbewusste Alltagskäufer, Gewerbekunden, regionale Käufer |
| 29.10.2026 | Bewerbung ohne Passwort; Zugang entsteht bei der Freischaltung durch das Team | Künstler-Fund 36: Passwort für einen Zugang, den es vielleicht nie gibt | Passwort bei der Bewerbung |
| 29.10.2026 | Warenkorb wird in einer Rückkehr-Route (`/bestellung/[id]/rueckkehr`) und in der Testkasse geleert, nie beim Rendern | Künstler-Fund 1: Kopfzeile zeigte „3“ neben „Bestellung eingegangen“, weil Layout und Seite parallel rendern | Leeren beim Rendern der Bestellseite |
| 29.10.2026 | Auszahlung ohne IBAN ist gesperrt (Service wirft, Knöpfe gesperrt mit Grund) | Künstler-Funde 21, 22: „ausgezahlt“ ohne Konto wäre das Gegenteil von fair | Nur Hinweis |
| 29.10.2026 | Kasse ohne AGB-Haken; Satz unter dem Knopf „Zahlungspflichtig bestellen“ | Künstler-Fund 7; in Deutschland genügt die Kenntnisnahme über den Button-Text und den Hinweis (juristisch vor dem Start prüfen lassen) | Pflicht-Haken |
