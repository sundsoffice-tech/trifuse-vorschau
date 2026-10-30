# trifuse-shop: Marktplatz für kleine Marken

Diese Datei wird in jeder Session automatisch geladen. Sie enthält, was eine Session falsch macht, wenn sie es
nicht liest. Fachliches steht in `README.md`, Entscheidungen mit Begründung in `docs/ENTSCHEIDUNGEN.md`,
der Weg nach oben in `docs/SKALIERUNG.md`, der aktuelle Stand in `docs/STATUS.md`.

## Feste Vorgaben von Fabrice (29.10.2026)

1. **Eigenbau.** Kein Medusa, kein Shopify, kein Saleor, kein fremdes Commerce-Backend. Vorbild ist die
   modulare Architektur von Medusa, der Code gehört komplett uns. Fremde Pakete nur für Infrastruktur
   (Next.js, Prisma, Stripe-SDK, Zod), nie für Geschäftslogik.
2. **Marke: trifuse.store** (Domain gekauft, Fabrice 29.10.2026). Die Endkunden-Marke von trifuse, erkennbar
   verwandt (Marine, Orange, Taschen-Symbol), mit eigenem Auftritt für Käufer. Das Versprechen „Direkt vom
   Macher, fair ausgezahlt“ steht als Zeile mit Betrag an jedem Produkt. Gestaltung: `DESIGN.md`
   (Standardweg in voller Qualität, Maßstab Manufactum und Etsy, Fabrices Wahl am 29.10.2026), Produktwahrheit:
   `PRODUCT.md`. Wortwahl: Macher, Verkauf, Art, „kommt zu dir“; nie Händler, Position, Netto im Kundentext.
3. **Zentrale Kasse, getrennte Buchführung je Händler.** Ein Warenkorb über alle Händler, eine Zahlung an den
   Marktplatz. Jede Bestellposition friert Händler, Preis, Provisionssatz, Provision und Händleranteil in Cent
   ein, damit die Ausschüttung später ohne Nachrechnen stimmt. Diese Einfrierung darf nie durch eine Berechnung
   zur Laufzeit ersetzt werden.
4. **Produkte kommen von beiden Seiten.** Das Team pflegt Produkte für Händler ein, Händler pflegen selbst.
   Händlerprodukte gehen über eine Freigabe, außer der Händler hat „darf selbst veröffentlichen“.
5. **Vorausdenken, skalierbar bauen, jeden Schritt vorher durchdenken und danach validieren.** Konkret:
   vor jeder Änderung die Frage „was passiert bei 50 Händlern, 5.000 Produkten, 2 Serverinstanzen?“ beantworten
   (siehe `docs/SKALIERUNG.md`), und vor jedem Commit die Prüfkette unten komplett fahren.

## Prüfkette vor jedem Commit (nicht verhandelbar)

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm start &            # oder laufender Server
npm run test:smoke     # Playwright: Seiten hell/dunkel, Kauf, Portal, Freigabe, Auszahlung, API
npm run test:parallel  # bei Änderungen an Kauf, Bestand oder Transaktionen: 20 und 30 gleichzeitige Käufer
npm run test:webhook   # bei Änderungen an Zahlung, Webhook, Rückbuchungen: signierte Stripe-Ereignisse offline
npm run test:sicherung # bei Änderungen an Datenbankpfad, Sicherung oder Rollout-Skripten
```

Dazu die Hausregel HINSEHEN: Alles Sichtbare in den Screenshots unter `test/ergebnisse/` ansehen, beide
Themes, schmal und breit. Ein grüner Test belegt nicht, dass es gut aussieht. Wer etwas Sichtbares ändert, das
der Smoke-Test nicht abdeckt, ergänzt den Smoke-Test. Vor jeder sichtbaren Änderung `DESIGN.md` und die
Verbotsliste im Skill `dossier` lesen; nach größeren Änderungen den Künstler-Agenten über
`node test/vorschau.mjs` laufen lassen (Vorbild: `docs/KUENSTLER-2026-10-29.md`).

## Architekturregeln

- Geschäftslogik liegt in `src/modules/<bereich>/` (`service.ts` = reine Logik, `actions.ts` = Server Actions
  mit Auth-Prüfung, `queries.ts` = Lesezugriffe). Seiten unter `src/app` enthalten keine Geschäftslogik.
- Jede Server Action prüft zuerst die Rolle (`requireAdmin`, `requireVendorUser`) und bei Händlern die
  Eigentümerschaft. Server Actions sind per POST von außen erreichbar.
- Geld immer in Cent als `Int`, nie Float. Rundung nur in `splitLine()` (`src/lib/money.ts`).
- Zahlung nur über die Provider-Schnittstelle `src/modules/payments/provider.ts`. Neue Anbieter als neuer
  Provider, nie im Checkout verdrahten.
- Mails nur über `queueMail()` in `src/modules/mail/service.ts` (Postausgang, erst speichern, dann senden) mit
  einer Vorlage aus `templates.ts` (rein, ohne Datenbank, mit relativen `.ts`-Importen für den Unit-Test).
  Auslöser liegen in `notify.ts`. Nie `nodemailer` direkt aus einer Action oder Seite aufrufen.
- Bilder nur über den Storage-Adapter `src/modules/media/storage.ts`. Der lokale Adapter ist der Start; ein
  S3-kompatibler Adapter kommt, sobald mehr als eine Instanz läuft.
- Datenbank: Prisma, heute SQLite. Kein datenbankspezifisches SQL außer `SELECT 1` (Health) und dem
  WAL-Pragma in `src/lib/db.ts`, das nur bei `file:`-URLs läuft. SQLite immer mit `connection_limit=1`
  (gemessen, siehe `docs/STATUS.md`). Der Wechsel auf Postgres darf nur Provider und URL kosten.
- Alles, was gleichzeitig passieren kann (Kauf, Bestand, Auszahlung), läuft in einer Transaktion mit
  Wiederholung bei Kollision. Nach jeder Änderung daran `npm run test:parallel` mit 20 und 30 Käufern fahren.
- Rückgaben und Erstattungen sind Rückbuchungen (`Reversal`) mit eingefrorenen negativen Beträgen, nie eine
  Änderung der Verkaufsposition. Reihenfolge immer: erst Buchung in der Datenbank, dann Geld beim
  Zahlungsdienst. Siehe `docs/ENTSCHEIDUNGEN.md` (30.10.2026).
- Next.js 16: Cache Components sind bewusst aus (`cacheComponents: false`), weil der Shop durchgehend
  nutzerabhängig rendert. Vor jeder Caching-Maßnahme `docs/SKALIERUNG.md` lesen.
- Sprache: Deutsch mit echten Umlauten in allen sichtbaren Texten, Commits und Doku. Englisch nur in
  Bezeichnern, Pfaden und Slugs.
- Keine Secrets im Code. `.env.example` pflegen, `.env` nie committen.
- Die Datenbank wird nie als Dateikopie gesichert (WAL), nur über `scripts/sicherung.mjs` (`VACUUM INTO`).
  Wiederherstellen nur bei gestopptem Dienst über `scripts/wiederherstellen.mjs`.

## Was nicht geht und warum

- `git push` in ein Repo außerhalb der Session-Quellen und `git remote add` werden vom Sicherheitsfilter der
  Cloud-Session blockiert. Deshalb liegt der Shop im Branch `claude/online-shop-product-listing-l9z787`
  des Repos `trifuse-vorschau` (Fabrice, 29.10.2026). Dieser Branch hat eine eigene Historie und wird nie in
  `main` von trifuse-vorschau gemergt: `main` dort ist ein GitHub-Pages-Deploy der Marketing-Vorschau.
  Pushen mit der vollen URL: `git push https://github.com/sundsoffice-tech/trifuse-vorschau.git <branch>`.
- Im Cloud-Container gibt es keinen Docker-Daemon. Der Docker-Build ist bis zu einem Lauf auf einem Server
  ungeprüft (Stand 29.10.2026).
