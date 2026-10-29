// Messung statt Vermutung: N gleichzeitige Käufe desselben Produkts dürfen den Bestand nie unter 0 drücken.
// Aufruf: node test/parallel.mjs http://localhost:3000 [anzahl]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const n = parseInt(process.argv[3] ?? "12", 10);

const list = await (await fetch(`${base}/api/v1/products?proSeite=100`)).json();
const target = list.items.filter((p) => p.stock > 0).sort((a, b) => a.stock - b.stock)[0];
if (!target) { console.error("Kein Produkt mit Bestand."); process.exit(2); }
console.log(`Produkt: ${target.title}, Bestand vorher: ${target.stock}, parallele Käufer: ${n}`);

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const results = await Promise.all(Array.from({ length: n }, async (_, i) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(`${base}${target.url}`);
    const btn = page.getByRole("button", { name: "In den Warenkorb" });
    if ((await btn.count()) === 0) return "ausverkauft-vorher";
    await btn.click();
    // Nur die Rückmeldung des Formulars zählt; "Ausverkauft" steht auch an Nachbarkarten.
    await Promise.race([
      page.getByText("Liegt im Warenkorb").waitFor({ timeout: 15000 }),
      page.locator("form [role=alert]").first().waitFor({ timeout: 15000 }),
    ]);
    if ((await page.locator("form [role=alert]").count()) > 0) return "nicht-in-warenkorb";
    await page.goto(`${base}/kasse`);
    if ((await page.locator("#email").count()) === 0) return "kein-warenkorb";
    await page.fill("#email", `k${i}@example.com`);
    await page.fill("#name", `Käufer ${i}`);
    await page.fill("#addressLine", "Teststr. 1");
    await page.fill("#postalCode", "41189");
    await page.fill("#city", "Mönchengladbach");
    await page.getByRole("button", { name: /Zahlungspflichtig bestellen/ }).click();
    // Entweder Weiterleitung zur Testkasse oder eine Fehlermeldung auf der Kassenseite.
    await Promise.race([
      page.waitForURL(/\/kasse\/test-zahlung\//, { timeout: 30000 }),
      page.locator("form [role=alert]").first().waitFor({ timeout: 30000 }),
    ]);
    if (!/test-zahlung/.test(page.url())) {
      const msg = (await page.locator("form [role=alert]").first().textContent())?.trim() ?? "unbekannt";
      return "abgelehnt:" + msg.replace(/\d+/g, "N");
    }
    await page.getByRole("button", { name: "Zahlung erfolgreich" }).click();
    await page.waitForURL(/\/bestellung\//, { timeout: 30000 });
    return "bezahlt";
  } catch (e) {
    return "fehler:" + (e instanceof Error ? e.message.split("\n")[0] : String(e));
  } finally {
    await ctx.close();
  }
}));
await browser.close();

const after = await (await fetch(`${base}/api/v1/products/${target.slug}`)).json();
const paid = results.filter((r) => r === "bezahlt").length;
const counts = results.reduce((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {});
console.log("Ergebnisse:", counts);
console.log(`Bestand nachher: ${after.stock ?? "(Produkt nicht mehr sichtbar)"}; bezahlte Käufe: ${paid}`);
// Offene (reservierte, noch nicht bezahlte) Bestellungen dürfen den Bestand zusätzlich mindern, nie darunter.
const reserved = target.stock - paid - (after.stock ?? 0);
const ok = paid > 0 && paid <= target.stock && (after.stock ?? 0) >= 0 && reserved >= 0;
console.log(`Reserviert in offenen Bestellungen: ${reserved}`);
console.log(ok ? "OK: kein Überverkauf, Bestand stimmt." : "FEHLER: Bestand und Käufe passen nicht zusammen.");
process.exit(ok ? 0 : 1);
