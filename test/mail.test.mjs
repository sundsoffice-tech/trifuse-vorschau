import test from "node:test";
import assert from "node:assert/strict";
import * as raw from "../src/modules/mail/templates.ts";

// Intl setzt vor das Euro-Zeichen ein geschütztes Leerzeichen; für lesbare Erwartungen hier normalisiert.
const plain = (m) => ({ ...m, subject: m.subject.replace(/\u00a0/g, " "), text: m.text.replace(/\u00a0/g, " "), html: m.html.replace(/\u00a0/g, " ") });
const wrap = (fn) => (...a) => plain(fn(...a));
const orderConfirmation = wrap(raw.orderConfirmation), vendorSale = wrap(raw.vendorSale), passwordReset = wrap(raw.passwordReset), payoutPaid = wrap(raw.payoutPaid), productDecision = wrap(raw.productDecision);

const order = {
  number: "M-2026-000042", name: "Test <Kundin>", email: "k@example.com", addressLine: "Nobelstr. 3", postalCode: "41189", city: "Mönchengladbach",
  subtotalCents: 1780, shippingCents: 490, totalCents: 2270,
  items: [
    { title: "Sommerhonig 500 g", quantity: 2, lineTotalCents: 1780, vendorNetCents: 1513, vendorName: "Wiesenkram", shippingBy: "WAREHOUSE" },
  ],
};

test("Bestellbestätigung nennt Nummer, Summe, Macheranteil und maskiert HTML", () => {
  const m = orderConfirmation(order, "https://trifuse.store/bestellung/x");
  assert.match(m.subject, /M-2026-000042/);
  assert.match(m.text, /Gesamt: 22,70 €/);
  assert.match(m.text, /15,13 € deiner Bestellung gehen direkt an Wiesenkram/);
  assert.ok(m.html.includes("Test &lt;Kundin&gt;"), "Name im HTML maskiert");
  assert.ok(!m.html.includes("<Kundin>"), "kein rohes HTML aus Nutzereingaben");
  assert.ok(m.text.includes("https://trifuse.store/bestellung/x"));
});

test("Verkaufsmeldung sagt dem Macher, ob er verschicken muss", () => {
  const lager = vendorSale("Hanna", order, order.items, "https://x/portal");
  assert.match(lager.text, /Wir verschicken aus unserem Lager/);
  const selbst = vendorSale("Hanna", order, [{ ...order.items[0], shippingBy: "VENDOR" }], "https://x/portal");
  assert.match(selbst.text, /Bitte verschicke die Ware an Test <Kundin>, Nobelstr\. 3, 41189 Mönchengladbach/);
  assert.match(selbst.text, /15,13 € kommen mit der nächsten Auszahlung/);
});

test("Passwort-, Auszahlungs- und Produktmails tragen Link und Zahlen", () => {
  assert.ok(passwordReset("Lea", "https://x/passwort-neu/abc").text.includes("https://x/passwort-neu/abc"));
  const p = payoutPaid("Lea", 8160, "Auszahlung Oktober 2026, Lichtwerk MG", 3, "https://x/portal/auszahlungen");
  assert.match(p.subject, /81,60 €/);
  assert.match(p.text, /3 Verkäufe/);
  assert.match(productDecision("Lea", "Kerze", false, "Foto fehlt", "https://x").text, /Grund: Foto fehlt/);
  assert.match(productDecision("Lea", "Kerze", true, "", "https://x").subject, /ist jetzt im Shop/);
});
