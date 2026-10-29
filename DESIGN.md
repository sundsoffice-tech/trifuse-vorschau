# Design: trifuse.store

Entschieden am 29.10.2026 (Fabrice): Standardweg in voller Qualität, Maßstab Manufactum und Etsy. Drei eigene
Richtungen (Kassenbon, Packband, Marktschild) liegen unter `design/richtungen/` und wurden nicht gewählt.

## Welt
Ein ruhiger, heller Marktplatz, der die Macher und ihren Anteil nach vorn stellt. Die Marke ist die Endkunden-
Marke von trifuse und zeigt das: Marine und Orange der Mutter, das Taschen-Symbol, die Wortmarke
„trifuse.store“ mit orangenem „.store“. Alles andere ist Zurückhaltung: Weiß, Grauton #f6f4f0 als zweite
Fläche, 1-px-Linien, Radius 6 px, keine Schatten.

## Farbe (Strategie: zurückhaltend, ein Akzent)
| Rolle | Hell | Dunkel |
|---|---|---|
| Grund | #ffffff | #0f171c |
| Zweite Fläche | #f6f4f0 | #1c2932 |
| Schrift | #14232b | #eef2f4 |
| Nebenschrift (≥ 4,5:1) | #3f4d55 / #5b6a73 | #c3ccd2 / #9aa7af |
| Akzent für Aktionen | #ff741f mit Schrift #14232b | #ff8a42 |
| Akzent als Text (≥ 4,5:1) | #b4480a | #ffa06a |

Orange nur für die eine Hauptaktion je Seite und für die Zeile „… gehen an …“. Grün, Gelb, Rot nur als
Zustandsfarben. Hell oder dunkel folgt dem Gerät; im Dunklen werden Bildflächen um 14 % gedämpft.

## Schrift
Source Serif 4 (Display, optische Größe) für Überschriften und Beträge in Kacheln; Source Sans 3 für alles
andere. Beide über next/font selbst gehostet. Ziffern in Tabellen und Preisen `tabular-nums lining-nums`
(Klasse `num`). Fließtext 16 px, Zeilenlänge bis 70 Zeichen, funktionaler Text nie unter 12 px.

## Bausteine
- Buttons: Radius 6 px, 44 px hoch, Primär orange, Sekundär weiß mit Linie, Ghost ohne Rahmen.
- Karten: weiß, 1-px-Linie, Radius 6 px, kein Schatten. Nie verschachtelt.
- Auswahl-Chips (Arten, Reiter): 44 px, Linie, gewählt invertiert (Marine).
- Kennzahlenband statt Statkarten: eine Zeile mit Trennlinien.
- Marker: kleines orangenes Quadrat, kein Eyebrow über Überschriften.
- Produktkarte: Bild quadratisch, Titel, Macher mit Ort, Preis links, Macheranteil rechts in Orange.

## Die eine Zeile
„Von 8,90 € gehen 7,57 € an Wiesenkram.“ Sie steht auf jeder Produktkarte, jeder Produktseite, im Warenkorb,
in der Kasse und auf der Bestellbestätigung. Sie ist das Versprechen der Marke und wird nie weggelassen.

## Wortwahl
Macher (nie Händler, Hersteller, Marke, Anbieter), Verkauf (nie Position), Art (nie Kategorie im Kundentext),
„kommt zu dir“ statt „Netto“, „unser Anteil“ statt „Provision“ im Kundentext. Du-Form überall.

## Nicht erlaubt (dossier-Verbotsliste)
Pill-Buttons, Glow-Blobs, Eyebrow-Labels, kursive Serif-Akzente, Lila-Verläufe, schwebende Karten mit
Doppelschatten, Statkarten-Reihen, identische Karten-Grids ohne Hierarchie, Em-Dash-Überdosis, Stockbilder.
