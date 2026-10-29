// Erzeugt saubere Vorschau-Screenshots aller Bereiche nach frischem Seed (fuer Praesentationen).
// Aufruf: node test/vorschau.mjs http://localhost:3000 [zielordner]
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = (process.argv[3] ?? new URL("./vorschau/", import.meta.url).pathname).replace(/\/?$/, "/");
await mkdir(out, { recursive: true });
const admin = { email: process.env.ADMIN_EMAIL ?? "admin@example.com", password: process.env.ADMIN_PASSWORD ?? "bitte-aendern" };
const vendor = { email: "wiesenkram@example.com", password: "haendler-demo-2026" };
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const shots = [];
async function shoot(page, name, full = true) { await page.screenshot({ path: `${out}${name}.png`, fullPage: full }); shots.push(name); }
async function login(page, who) {
  await page.goto(base + "/login"); await page.fill("#email", who.email); await page.fill("#password", who.password);
  await page.getByRole("button", { name: "Anmelden" }).click(); await page.waitForURL(/\/(portal|admin)/);
}

// Kunde: Einkauf ueber zwei Marken, Testzahlung
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  await page.goto(base + "/"); await shoot(page, "shop-start");
  await page.goto(base + "/produkte"); await shoot(page, "shop-produkte");
  await page.goto(base + "/produkt/sommerhonig-500-g"); await shoot(page, "shop-produkt");
  await page.getByRole("button", { name: "In den Warenkorb" }).click(); await page.getByText("Liegt im Warenkorb").waitFor();
  await page.goto(base + "/produkt/muesli-schale-salbei"); await page.selectOption("#quantity", "2");
  await page.getByRole("button", { name: "In den Warenkorb" }).click(); await page.getByText("Liegt im Warenkorb").waitFor();
  await page.goto(base + "/macher"); await shoot(page, "shop-macher");
  await page.goto(base + "/warenkorb"); await shoot(page, "shop-warenkorb");
  await page.goto(base + "/kasse");
  await page.fill("#email", "anna.beispiel@example.com"); await page.fill("#name", "Anna Beispiel"); await page.fill("#addressLine", "Lindenstraße 12");
  await page.fill("#postalCode", "41061"); await page.fill("#city", "Mönchengladbach"); await page.fill("#note", "Alles Gute zum Geburtstag, Mama!");
  await shoot(page, "shop-kasse");
  await page.getByRole("button", { name: /Zahlungspflichtig bestellen/ }).click(); await page.waitForURL(/test-zahlung/);
  await shoot(page, "shop-testkasse");
  await page.getByRole("button", { name: "Zahlung erfolgreich" }).click(); await page.waitForURL(/\/bestellung\//);
  await shoot(page, "shop-bestellung");
  await page.goto(base + "/verkaufen"); await shoot(page, "shop-verkaufen");
  await ctx.close();
}
// Hell am Handy, dunkel am Rechner (Künstler: nicht angesehen)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage();
  await page.goto(base + "/produkt/muesli-schale-salbei"); await shoot(page, "mobil-produkt-hell", false);
  await page.goto(base + "/kasse"); await shoot(page, "mobil-kasse-hell", false);
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" }); const page2 = await ctx2.newPage();
  await page2.goto(base + "/produkte"); await shoot(page2, "desktop-produkte-dunkel", false);
  await ctx2.close();
}
// Mobil und dunkel
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", deviceScaleFactor: 2 }); const page = await ctx.newPage();
  await page.goto(base + "/"); await shoot(page, "mobil-start-dunkel", false);
  await page.goto(base + "/warenkorb"); await shoot(page, "mobil-warenkorb-dunkel", false);
  await page.goto(base + "/produkt/rapswachskerze-terrakotta"); await shoot(page, "mobil-produkt-dunkel", false);
  await page.goto(base + "/produkte?kategorie=kueche"); await shoot(page, "mobil-kategorie-dunkel", false);
  await ctx.close();
}
// Haendler
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  await login(page, vendor);
  await shoot(page, "portal-uebersicht");
  await page.goto(base + "/portal/produkte"); await shoot(page, "portal-produkte");
  await page.goto(base + "/portal/produkte/neu"); await shoot(page, "portal-produkt-neu");
  await page.goto(base + "/portal/bestellungen"); await shoot(page, "portal-verkaeufe");
  await page.goto(base + "/portal/auszahlungen"); await shoot(page, "portal-auszahlungen");
  await page.goto(base + "/portal/einstellungen"); await shoot(page, "portal-einstellungen");
  await ctx.close();
}
// Verwaltung
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
  await login(page, admin);
  await shoot(page, "admin-uebersicht");
  await page.goto(base + "/admin/produkte?status=PENDING"); await shoot(page, "admin-freigabe");
  await page.goto(base + "/admin/produkte?status=ALL"); await shoot(page, "admin-produkte");
  await page.goto(base + "/admin/haendler"); await shoot(page, "admin-haendler");
  const firstVendor = await page.locator("table a").first().getAttribute("href");
  await page.goto(base + firstVendor); await shoot(page, "admin-haendler-detail");
  await page.goto(base + "/admin/bestellungen"); await shoot(page, "admin-bestellungen");
  const firstOrder = await page.locator("table a").first().getAttribute("href");
  await page.goto(base + firstOrder); await shoot(page, "admin-bestellung-detail");
  await page.goto(base + "/admin/auszahlungen"); await shoot(page, "admin-auszahlungen");
  await page.getByRole("button", { name: "Auszahlung erstellen" }).first().click(); await page.waitForURL(/\/admin\/auszahlungen\/[a-z0-9]+/);
  await shoot(page, "admin-auszahlung-abrechnung");
  await page.goto(base + "/admin/kategorien"); await shoot(page, "admin-kategorien");
  await page.goto(base + "/admin/einstellungen"); await shoot(page, "admin-einstellungen");
  await ctx.close();
}
await browser.close();
console.log(`${shots.length} Screenshots in ${out}`);
