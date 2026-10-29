import { BRAND } from "@/lib/brand";
import { Alert } from "@/components/ui/alert";

const texts: Record<string, string[]> = {
  impressum: [
    "Angaben gemäß § 5 DDG.",
    "[Firmenname des Betreibers] · [Rechtsform] · [Straße Hausnummer] · [PLZ Ort]",
    "Vertreten durch: [Name(n)]",
    "Kontakt: [Telefon] · [E-Mail]",
    "Umsatzsteuer-Identifikationsnummer: [USt-IdNr.]",
    "Verantwortlich für den Inhalt: [Name, Anschrift]",
    "Plattform der EU-Kommission zur Online-Streitbeilegung: https://ec.europa.eu/consumers/odr",
  ],
  datenschutz: [
    "Verantwortlicher: [Firmenname, Anschrift, E-Mail].",
    "Beim Besuch dieser Seite verarbeiten wir technisch notwendige Daten (IP-Adresse, Zeitpunkt, aufgerufene Seite) zur Auslieferung der Seite.",
    "Für den Warenkorb setzen wir ein technisch notwendiges Cookie ohne Tracking.",
    "Bei einer Bestellung verarbeiten wir Name, Anschrift und E-Mail zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) und geben sie an den Zahlungsdienstleister sowie an Versanddienstleister weiter, soweit erforderlich.",
    "Zahlungen werden über [Zahlungsdienstleister] abgewickelt; die Zahlungsdaten werden dort verarbeitet.",
    "Händlern, deren Produkte Sie kaufen, werden nur die Angaben weitergegeben, die zur Lieferung nötig sind.",
    "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Beschwerde bei einer Aufsichtsbehörde.",
  ],
  agb: [
    "§ 1 Geltungsbereich: Diese Bedingungen gelten für alle Bestellungen über diesen Marktplatz. Vertragspartner des Kunden ist [Betreiber], der die Produkte im eigenen Namen verkauft.",
    "§ 2 Vertragsschluss: Mit Klick auf „Kostenpflichtig bestellen und bezahlen“ gibt der Kunde ein verbindliches Angebot ab. Der Vertrag kommt mit der Zahlungsbestätigung zustande.",
    "§ 3 Preise und Zahlung: Alle Preise verstehen sich in Euro inklusive gesetzlicher Umsatzsteuer zuzüglich der angezeigten Versandkosten.",
    "§ 4 Lieferung: Die Lieferung erfolgt an die angegebene Adresse innerhalb Deutschlands. Lieferzeiten stehen beim Produkt.",
    "§ 5 Gewährleistung: Es gelten die gesetzlichen Gewährleistungsrechte.",
    "§ 6 Widerruf: Verbrauchern steht das gesetzliche Widerrufsrecht zu, siehe Widerrufsbelehrung.",
    "Hinweis: Dieser Text ist ein Platzhalter und muss vor dem Start rechtlich geprüft werden.",
  ],
  widerruf: [
    "Widerrufsrecht: Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Frist beginnt mit dem Tag, an dem Sie oder ein von Ihnen benannter Dritter die Waren in Besitz genommen haben.",
    "Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ([Betreiber, Anschrift, E-Mail]) mittels einer eindeutigen Erklärung über Ihren Entschluss informieren.",
    "Folgen des Widerrufs: Wir zahlen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten, unverzüglich und spätestens binnen vierzehn Tagen zurück.",
    "Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.",
    "Hinweis: Dieser Text ist ein Platzhalter und muss vor dem Start rechtlich geprüft werden.",
  ],
};

export function LegalPage({ slug, title }: { slug: string; title: string }) {
  const paragraphs = texts[slug] ?? [];
  return (
    <div className="container-x py-10 max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl font-semibold">{title}</h1>
      <div className="mt-4"><Alert tone="warn">Platzhaltertext. Felder in eckigen Klammern mit den Daten des Betreibers von {BRAND.name} füllen und vor dem Start juristisch prüfen lassen.</Alert></div>
      <div className="prose mt-6 text-ink-2">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
    </div>
  );
}
