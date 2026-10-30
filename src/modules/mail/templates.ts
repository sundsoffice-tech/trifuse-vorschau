// Reine Vorlagen ohne Datenbank und ohne "server-only", damit sie im Unit-Test laufen.
// Relative Importe statt "@/", damit die reinen Vorlagen auch direkt unter node laufen (Unit-Test).
import { BRAND } from "../../lib/brand.ts";
import { formatCents } from "../../lib/money.ts";

export type MailContent = { template: string; subject: string; text: string; html: string };

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Ein Block ist ein Absatz, eine Liste von Zeilen oder ein Link. */
type Block = { p: string } | { lines: string[] } | { link: string; label: string } | { small: string };

function render(template: string, subject: string, blocks: Block[]): MailContent {
  const text = blocks
    .map((b) => ("p" in b ? b.p : "lines" in b ? b.lines.join("\n") : "link" in b ? `${b.label}: ${b.link}` : b.small))
    .join("\n\n");
  const body = blocks
    .map((b) =>
      "p" in b
        ? `<p style="margin:0 0 16px">${esc(b.p)}</p>`
        : "lines" in b
          ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f6f4f0;border-radius:6px">${b.lines.map(esc).join("<br>")}</p>`
          : "link" in b
            ? `<p style="margin:0 0 20px"><a href="${esc(b.link)}" style="display:inline-block;background:#ff741f;color:#14232b;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:6px">${esc(b.label)}</a><br><span style="font-size:13px;color:#5c6a72">Falls der Knopf nicht geht: ${esc(b.link)}</span></p>`
            : `<p style="margin:0 0 12px;font-size:13px;color:#5c6a72">${esc(b.small)}</p>`,
    )
    .join("");
  const html = `<!doctype html><html lang="de"><body style="margin:0;background:#f6f4f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#14232b"><div style="max-width:560px;margin:0 auto;padding:24px 16px"><p style="font-size:20px;font-weight:700;margin:0 0 20px">${esc(BRAND.name)}</p><div style="background:#fff;border:1px solid #e3e0d9;border-radius:6px;padding:24px;font-size:16px;line-height:1.5">${body}</div><p style="font-size:12px;color:#5c6a72;margin:16px 0 0">${esc(BRAND.name)} · ${esc(BRAND.claim)} · Fragen an ${esc(BRAND.supportEmail)}</p></div></body></html>`;
  return { template, subject, text: `${text}\n\n--\n${BRAND.name} · ${BRAND.claim}\nFragen an ${BRAND.supportEmail}`, html };
}

export type OrderForMail = {
  number: string;
  name: string;
  email: string;
  addressLine: string;
  postalCode: string;
  city: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: { title: string; quantity: number; lineTotalCents: number; vendorNetCents: number; vendorName: string; shippingBy: "VENDOR" | "WAREHOUSE" }[];
};

export function orderConfirmation(order: OrderForMail, orderUrl: string): MailContent {
  const share = order.items.reduce((s, i) => s + i.vendorNetCents, 0);
  const makers = [...new Set(order.items.map((i) => i.vendorName))];
  return render("order-confirmation", `Deine Bestellung ${order.number} ist eingegangen`, [
    { p: `Hallo ${order.name}, danke für deine Bestellung. Wir melden uns, sobald das Paket unterwegs ist, in der Regel in 2 bis 4 Werktagen.` },
    { lines: [...order.items.map((i) => `${i.quantity} × ${i.title} (${i.vendorName}): ${formatCents(i.lineTotalCents)}`), `Versand: ${formatCents(order.shippingCents)}`, `Gesamt: ${formatCents(order.totalCents)}`] },
    { p: `${formatCents(share)} deiner Bestellung gehen direkt an ${makers.length === 1 ? makers[0] : `${makers.length} Macher`}.` },
    { lines: [`Lieferadresse:`, order.name, order.addressLine, `${order.postalCode} ${order.city}`] },
    { link: orderUrl, label: "Bestellung ansehen" },
    { small: `Fragen? Antworte auf diese Mail oder schreib an ${BRAND.supportEmail} und nenne die Bestellnummer ${order.number}.` },
  ]);
}

export function vendorSale(vendorName: string, order: OrderForMail, items: OrderForMail["items"], portalUrl: string): MailContent {
  const net = items.reduce((s, i) => s + i.vendorNetCents, 0);
  const mustShip = items.some((i) => i.shippingBy === "VENDOR");
  return render("vendor-sale", `Verkauft: ${items.length === 1 ? items[0].title : `${items.length} Produkte`} (${order.number})`, [
    { p: `Hallo ${vendorName}, jemand hat gerade bei dir gekauft.` },
    { lines: items.map((i) => `${i.quantity} × ${i.title}: ${formatCents(i.vendorNetCents)} kommen zu dir`) },
    { p: mustShip ? `Bitte verschicke die Ware an ${order.name}, ${order.addressLine}, ${order.postalCode} ${order.city} und melde den Versand im Macherbereich.` : "Wir verschicken aus unserem Lager, du musst nichts tun." },
    { p: `${formatCents(net)} kommen mit der nächsten Auszahlung zu dir.` },
    { link: portalUrl, label: "Zum Macherbereich" },
  ]);
}

export function applicationReceived(contactName: string, responseDays: number): MailContent {
  return render("application-received", `Deine Bewerbung bei ${BRAND.name} ist da`, [
    { p: `Hallo ${contactName}, danke, dass du bei ${BRAND.name} verkaufen willst. Wir sehen uns deine Arbeit an und melden uns innerhalb von ${responseDays} Tagen.` },
    { p: "Du musst jetzt nichts tun. Wenn wir Fragen haben, schreiben wir dir." },
  ]);
}

export function applicationForTeam(vendorName: string, contactName: string, city: string, website: string, adminUrl: string): MailContent {
  return render("application-team", `Neue Bewerbung: ${vendorName}`, [
    { lines: [`Marke: ${vendorName}`, `Kontakt: ${contactName}`, `Ort: ${city || "nicht angegeben"}`, `Website: ${website || "keine"}`] },
    { link: adminUrl, label: "Bewerbung ansehen" },
  ]);
}

export function vendorWelcome(contactName: string, vendorName: string, setPasswordUrl: string): MailContent {
  return render("vendor-welcome", `Willkommen bei ${BRAND.name}: dein Zugang für ${vendorName}`, [
    { p: `Hallo ${contactName}, wir freuen uns, ${vendorName} dabei zu haben. Mit dem Knopf unten legst du dein Passwort fest; der Link gilt 7 Tage.` },
    { link: setPasswordUrl, label: "Passwort festlegen" },
    { p: "Danach kannst du Produkte anlegen, deine Bankverbindung eintragen und erzählen, wer du bist." },
  ]);
}

export function passwordReset(name: string, url: string): MailContent {
  return render("password-reset", `Neues Passwort für ${BRAND.name}`, [
    { p: `Hallo ${name}, mit dem Knopf unten legst du ein neues Passwort fest. Der Link gilt zwei Stunden.` },
    { link: url, label: "Neues Passwort festlegen" },
    { small: "Wenn du das nicht warst, kannst du diese Mail ignorieren; dein Passwort bleibt, wie es ist." },
  ]);
}

export function productDecision(vendorName: string, title: string, approved: boolean, reason: string, url: string): MailContent {
  return approved
    ? render("product-approved", `„${title}“ ist jetzt im Shop`, [{ p: `Hallo ${vendorName}, „${title}“ ist freigegeben und ab sofort zu kaufen.` }, { link: url, label: "Im Shop ansehen" }])
    : render("product-rejected", `„${title}“ braucht noch etwas`, [
        { p: `Hallo ${vendorName}, „${title}“ haben wir noch nicht freigegeben.` },
        { lines: [`Grund: ${reason || "ohne Angabe"}`] },
        { p: "Du kannst das Produkt im Macherbereich ändern und erneut einreichen." },
        { link: url, label: "Produkt bearbeiten" },
      ]);
}

export function payoutPaid(vendorName: string, totalCents: number, reference: string, count: number, url: string): MailContent {
  return render("payout-paid", `Auszahlung überwiesen: ${formatCents(totalCents)}`, [
    { p: `Hallo ${vendorName}, wir haben ${formatCents(totalCents)} für ${count} ${count === 1 ? "Verkauf" : "Verkäufe"} an dich überwiesen.` },
    { lines: [`Verwendungszweck: ${reference}`] },
    { link: url, label: "Abrechnung ansehen" },
  ]);
}

export function refundConfirmation(name: string, orderNumber: string, amountCents: number, orderUrl: string): MailContent {
  return render("refund-confirmation", `Erstattung zu Bestellung ${orderNumber}`, [
    { p: `Hallo ${name}, wir haben ${formatCents(amountCents)} zu deiner Bestellung ${orderNumber} zurückgezahlt. Je nach Bank dauert es 3 bis 10 Werktage, bis der Betrag bei dir ankommt.` },
    { link: orderUrl, label: "Bestellung ansehen" },
  ]);
}
