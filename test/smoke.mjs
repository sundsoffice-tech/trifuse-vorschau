// Durchlauf gegen einen laufenden Server: Shop, Kauf im Testmodus, Händlerportal, Admin-Freigabe, Auszahlung.
// Aufruf: node test/smoke.mjs http://localhost:3000
// Schreibt Screenshots (hell/dunkel, schmal/breit) nach test/ergebnisse/.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

// Playwright kann global installiert sein (NODE_PATH); createRequire findet es auch dann.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = new URL("./ergebnisse/", import.meta.url).pathname;
await mkdir(out, { recursive: true });
const admin = { email: process.env.ADMIN_EMAIL ?? "admin@example.com", password: process.env.ADMIN_PASSWORD ?? "bitte-aendern" };
const vendor = { email: "wiesenkram@example.com", password: "haendler-demo-2026" };

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "OK " : "FEHLER"} ${label}`); if (!ok) failures++; };

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
async function shoot(page, name) {
  await page.screenshot({ path: `${out}${name}.png`, fullPage: true });
}

// 1. Öffentliche Seiten, hell + dunkel, schmal + breit
for (const [theme, width] of [["light", 1280], ["dark", 390]]) {
  const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/produkte", "/produkte?kategorie=kueche", "/macher", "/macher/wiesenkram", "/verkaufen", "/login", "/impressum"]) {
    const res = await page.goto(base + path);
    check(res?.ok(), `${theme} ${width}px GET ${path} -> ${res?.status()}`);
  }
  await page.goto(base + "/");
  await shoot(page, `start-${theme}-${width}`);
  await page.goto(base + "/produkte");
  await shoot(page, `produkte-${theme}-${width}`);
  check(errors.length === 0, `keine JS-Fehler (${theme}): ${errors.join("; ")}`);
  await ctx.close();
}

// 2. Kaufablauf im Testmodus
let orderNumber = null;
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/macher/wiesenkram");
  // Erstes Produkt, das nicht ausverkauft ist (Parallelproben kaufen Bestände leer).
  const first = page.locator('article:not(:has-text("Ausverkauft")) :is(h2,h3) a').first();
  const title = (await first.textContent())?.trim();
  await first.click();
  await page.waitForURL(/\/produkt\//);
  check((await page.textContent("body"))?.includes("gehen") ?? false, "Produktseite zeigt den Anteil für den Macher");
  await shoot(page, "produkt");
  await page.getByRole("button", { name: "In den Warenkorb" }).click();
  await page.getByText("Liegt im Warenkorb").waitFor();
  await page.goto(base + "/warenkorb");
  check((await page.textContent("body"))?.includes(title ?? "###") ?? false, "Produkt liegt im Warenkorb");
  await shoot(page, "warenkorb");
  await page.goto(base + "/kasse");
  await page.fill("#email", "kunde@example.com");
  await page.fill("#name", "Test Kundin");
  await page.fill("#addressLine", "Nobelstr. 3");
  await page.fill("#postalCode", "41189");
  await page.fill("#city", "Mönchengladbach");
  await shoot(page, "kasse");
  await page.getByRole("button", { name: /Zahlungspflichtig bestellen/ }).click();
  await page.waitForURL(/\/kasse\/test-zahlung\//);
  await page.getByRole("button", { name: "Zahlung erfolgreich" }).click();
  await page.waitForURL(/\/bestellung\//);
  const body = await page.textContent("body");
  check(body?.includes("Danke, deine Bestellung ist eingegangen") ?? false, "Bestellbestätigung nach Testzahlung");
  check(!/Warenkorb\s*\d/.test(body ?? ""), "Warenkorb-Zähler nach dem Kauf leer");
  const number = body?.match(/M-\d{4}-\d{6}/)?.[0];
  orderNumber = number ?? null;
  check(Boolean(number), `Bestellnummer vergeben: ${number}`);
  await shoot(page, "bestellung");
  await page.goto(base + "/warenkorb");
  check((await page.textContent("body"))?.includes("Dein Warenkorb ist leer") ?? false, "Warenkorb nach Kauf geleert");
  await ctx.close();
}

// 3. Händlerportal: anmelden, Produkt anlegen und einreichen
let newProductTitle = `Smoke-Produkt ${Date.now().toString(36)}`;
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.fill("#email", vendor.email);
  await page.fill("#password", vendor.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(/\/portal/);
  await shoot(page, "portal-uebersicht");
  await page.goto(base + "/portal/produkte/neu");
  await page.fill("#title", newProductTitle);
  await page.fill("#description", "Automatisch angelegtes Testprodukt.");
  await page.fill("#price", "7,50");
  await page.fill("#stock", "5");
  await page.selectOption("#categoryId", { index: 1 });
  await page.getByRole("button", { name: /zur Freigabe schicken/ }).click();
  await page.waitForURL(/\/portal\/produkte\/(?!neu)[a-z0-9]+/);
  check((await page.textContent("body"))?.includes("Wartet auf Freigabe") ?? false, "Händlerprodukt wartet auf Freigabe");
  await shoot(page, "portal-produkt");
  await page.goto(base + "/portal/bestellungen");
  check((await page.textContent("body"))?.includes("M-") ?? false, "Händler sieht bezahlte Positionen");
  await page.goto(base + "/portal/auszahlungen");
  await shoot(page, "portal-auszahlungen");
  await ctx.close();
}

// 4. Admin: Produkt freigeben, Auszahlung erstellen und als bezahlt markieren
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.fill("#email", admin.email);
  await page.fill("#password", admin.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(/\/admin/);
  await shoot(page, "admin-uebersicht");
  await page.goto(base + "/admin/produkte?status=PENDING");
  const row = page.locator("li", { hasText: newProductTitle });
  await row.getByRole("button", { name: "Freigeben" }).click();
  await page.waitForLoadState("networkidle");
  await page.goto(base + "/produkte?q=" + encodeURIComponent(newProductTitle));
  check((await page.textContent("body"))?.includes(newProductTitle) ?? false, "Freigegebenes Produkt ist im Shop sichtbar");
  await page.goto(base + "/admin/auszahlungen");
  await shoot(page, "admin-auszahlungen");
  // Der Macher des gekauften Produkts hat je nach Vorlauf einen positiven Saldo (Auszahlung) oder einen
  // ausgeglichenen (Verrechnung): jede Runde dieses Tests bucht am Ende eine Rückgabe, die vorgetragen wird.
  const wiesenkramRow = page.locator("tr", { hasText: "Wiesenkram" }).first();
  const createButton = wiesenkramRow.getByRole("button", { name: "Auszahlung erstellen" });
  const settleButton = wiesenkramRow.getByRole("button", { name: "Verrechnen" });
  const hasCreate = (await createButton.count()) > 0;
  check(hasCreate || (await settleButton.count()) > 0, "Offener Saldo für den Macher des Kaufs vorhanden");
  await (hasCreate ? createButton : settleButton).click();
  await page.waitForURL(/\/admin\/auszahlungen\/[a-z0-9]+/);
  await shoot(page, "admin-auszahlung-detail");
  if (hasCreate) {
    await page.fill("input[name=reference]", "SMOKE-UEBERWEISUNG");
    await page.getByRole("button", { name: "Als überwiesen markieren" }).click();
    await page.waitForLoadState("networkidle");
    check((await page.textContent("body"))?.includes("Diese Auszahlung ist überwiesen") ?? false, "Auszahlung als überwiesen markiert");
  } else {
    check((await page.textContent("body"))?.includes("Verrechnet, es war keine Überweisung nötig") ?? false, "Saldo null: Verkauf und vorgetragene Rückgabe verrechnet, keine Überweisung");
  }
  await page.goto(base + "/admin/bestellungen");
  await shoot(page, "admin-bestellungen");
  // Rückgabe nach der Auszahlung: Rückbuchung entsteht, Geld simuliert zurück, Saldo beim Macher negativ
  await page.getByRole("link", { name: orderNumber }).click();
  await page.waitForURL(/\/admin\/bestellungen\/[a-z0-9]+/);
  await page.locator("summary", { hasText: "Zurückbuchen" }).first().click();
  await page.locator("form:has(input[name=itemId])").first().getByRole("button", { name: "Zurückbuchen" }).click();
  await page.waitForLoadState("networkidle");
  const nachRueckgabe = await page.textContent("body");
  check(nachRueckgabe?.includes("Rückbuchungen") && nachRueckgabe.includes("zurückgezahlt") && nachRueckgabe.includes("in nächster Auszahlung"), "Rückbuchung gebucht, Testrückzahlung vermerkt, wartet auf nächste Auszahlung");
  check(nachRueckgabe?.includes("Vollständig erstattet") ?? false, "Bestellung mit einer Position ist nach der Rückgabe vollständig erstattet");
  await shoot(page, "admin-bestellung-rueckbuchung");
  await page.goto(base + "/admin/auszahlungen");
  const saldo = await page.textContent("body");
  check(saldo?.includes("Negativer Saldo") ?? false, "Auszahlungsübersicht zeigt den negativen Saldo des Machers");
  await shoot(page, "admin-auszahlungen-rueckbuchung");
  await ctx.close();
}

// 4b. Macher sieht die Rückgabe
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.fill("#email", vendor.email);
  await page.fill("#password", vendor.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(/\/portal/);
  await page.goto(base + "/portal/auszahlungen");
  const t = await page.textContent("body");
  check((t?.includes("Rückgabe") && t.includes("verrechnet")) ?? false, "Macher sieht Rückgabe und Verrechnungshinweis");
  await page.goto(base + "/portal/bestellungen");
  check((await page.textContent("body"))?.includes("Rückgabe 1 Stück") ?? false, "Rückgabe steht beim Verkauf des Machers");
  await ctx.close();
}

// 5. API
{
  const res = await fetch(base + "/api/v1/products");
  const json = await res.json();
  check(res.ok && Array.isArray(json.items) && json.items.length > 0, `API /api/v1/products liefert ${json.items?.length} Produkte`);
  const health = await fetch(base + "/api/health");
  check(health.ok, "API /api/health");
}

await browser.close();
console.log(failures === 0 ? "\nAlle Prüfungen bestanden." : `\n${failures} Prüfung(en) fehlgeschlagen.`);
process.exit(failures === 0 ? 0 : 1);
