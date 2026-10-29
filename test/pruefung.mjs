// impeccable audit + harden + onboard, messbar: Konsole, Alt-Texte, Labels, Überschriften, Landmarken,
// Trefferflächen, horizontaler Überlauf, Seitengewicht, LCP; Randzustände als Screenshots; Macher-Erstlauf.
// Aufruf: node test/pruefung.mjs http://localhost:3000
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const out = new URL("./pruefung/", import.meta.url).pathname;
await mkdir(out, { recursive: true });
const db = new PrismaClient();
const admin = { email: process.env.ADMIN_EMAIL ?? "admin@example.com", password: process.env.ADMIN_PASSWORD ?? "bitte-aendern" };
const report = { audit: [], zustaende: [], onboard: [] };
const browser = await chromium.launch();

async function login(page, who) {
  await page.goto(base + "/login"); await page.fill("#email", who.email); await page.fill("#password", who.password);
  await page.getByRole("button", { name: "Anmelden" }).click(); await page.waitForURL(/\/(portal|admin)/);
}

async function aufraeumen() {
  const probe = await db.vendor.findMany({ where: { OR: [{ name: "Probewerkstatt" }, { name: "Approve-Probe" }, { slug: { startsWith: "pruefung-" } }] }, select: { id: true } });
  const ids = probe.map((v) => v.id);
  await db.cartItem.deleteMany({ where: { product: { OR: [{ vendorId: { in: ids } }, { slug: { startsWith: "pruefung-" } }] } } });
  await db.productImage.deleteMany({ where: { product: { OR: [{ vendorId: { in: ids } }, { slug: { startsWith: "pruefung-" } }] } } });
  await db.product.deleteMany({ where: { OR: [{ vendorId: { in: ids } }, { slug: { startsWith: "pruefung-" } }] } });
  await db.user.deleteMany({ where: { vendorId: { in: ids } } });
  await db.vendor.deleteMany({ where: { id: { in: ids } } });
}
await aufraeumen();
// Harte Testdaten: langer Name, Emoji, lange Macher-Namen, großer Preis
const ton = await db.vendor.findUniqueOrThrow({ where: { slug: "ton-und-tisch" } });
const kat = await db.category.findFirst();
await db.product.upsert({
  where: { slug: "pruefung-langer-titel" }, update: {},
  create: { vendorId: ton.id, slug: "pruefung-langer-titel", title: "Handgedrehte Steinzeugschale mit Salbeiglasur, spülmaschinenfest, in Viersen gebrannt, Durchmesser vierzehn Zentimeter 🌿", description: "Sehrlangeswortohneleerzeichenzumtestenobesumbrichtoderdieseitesprengt ".repeat(4) + "\n\nNormaler Absatz. مرحبا بالعالم. 日本語のテキスト。", priceCents: 1234567, stock: 2, status: "ACTIVE", categoryId: kat?.id ?? null, images: { create: [{ path: "/demo/schale.svg", alt: "Schale", sortOrder: 0 }] } },
});
const langerMacher = await db.vendor.upsert({
  where: { slug: "pruefung-langer-machername" }, update: {},
  create: { slug: "pruefung-langer-machername", name: "Werkstatt für außergewöhnlich lange Markennamen und Töpferwaren GbR", email: "lang@example.com", city: "Mönchengladbach-Rheydt-Odenkirchen", status: "ACTIVE", commissionPercent: 15, payoutIban: "DE02120300000000202051", description: "A".repeat(600) },
});
await db.product.upsert({ where: { slug: "pruefung-kurz" }, update: {}, create: { vendorId: langerMacher.id, slug: "pruefung-kurz", title: "Ei", priceCents: 1, stock: 1, status: "ACTIVE", categoryId: kat?.id ?? null } });

report.fehler = [];
async function abschnitt(name, fn) { try { await fn(); } catch (e) { report.fehler.push(`${name}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)} @ ${(e.stack ?? "").split("\n").find((l) => l.includes("pruefung.mjs")) ?? ""}`); } }
// ---------- AUDIT ----------
await abschnitt("audit", async () => {
const seiten = ["/", "/produkte", "/produkte?q=honig", "/produkt/sommerhonig-500-g", "/produkt/pruefung-langer-titel", "/macher", "/macher/wiesenkram", "/verkaufen", "/login", "/warenkorb", "/kasse", "/impressum"];
for (const [name, vp] of [["desktop", { width: 1280, height: 900 }], ["mobil", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  // Warenkorb füllen für /warenkorb und /kasse
  await page.goto(base + "/produkt/sommerhonig-500-g"); await page.getByRole("button", { name: "In den Warenkorb" }).click(); await page.getByText("Liegt im Warenkorb").waitFor();
  for (const pfad of seiten) {
    const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    let bytes = 0; const onResp = async (r) => { try { const b = await r.body(); bytes += b.length; } catch {} }; page.on("response", onResp);
    const t0 = Date.now(); const res = await page.goto(base + pfad, { waitUntil: "networkidle" }); const dauer = Date.now() - t0;
    page.off("response", onResp);
    const m = await page.evaluate(() => {
      const q = (s) => Array.from(document.querySelectorAll(s));
      const sichtbar = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const imgsOhneAlt = q("img").filter((i) => !i.hasAttribute("alt")).length;
      const inputsOhneLabel = q("input:not([type=hidden]), select, textarea").filter((el) => !el.labels?.length && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")).map((el) => el.name || el.id);
      const leereKnoepfe = q("a, button").filter((el) => sichtbar(el) && !(el.innerText || "").trim() && !el.getAttribute("aria-label") && !el.querySelector("img[alt]:not([alt=''])")).length;
      const hs = q("h1,h2,h3,h4").map((h) => parseInt(h.tagName[1], 10));
      let sprung = 0; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) sprung++;
      const kleineZiele = q("a, button, input[type=submit], select").filter((el) => sichtbar(el)).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.innerText || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; }).filter((z) => z.h < 44 && z.h > 0 && !(z.t === "" && z.h === 0));
      const ueberlauf = document.documentElement.scrollWidth > window.innerWidth + 1;
      const lcp = performance.getEntriesByType("largest-contentful-paint").pop()?.startTime ?? null;
      return { imgsOhneAlt, inputsOhneLabel, leereKnoepfe, h1: hs.filter((x) => x === 1).length, sprung, landmarken: { main: !!document.querySelector("main"), nav: !!document.querySelector("nav"), header: !!document.querySelector("header"), footer: !!document.querySelector("footer") }, kleineZiele: kleineZiele.slice(0, 8), anzahlKleineZiele: kleineZiele.length, ueberlauf, lcp: lcp ? Math.round(lcp) : null, fokusSichtbar: Array.from(document.styleSheets).some((s) => { try { return Array.from(s.cssRules).some((r) => r.cssText.includes(":focus-visible")); } catch { return false; } }) };
    });
    // Tastatur: Tab durch die ersten 12 Elemente, Fokus-Ring vorhanden?
    const fokus = [];
    for (let i = 0; i < 12; i++) { await page.keyboard.press("Tab"); fokus.push(await page.evaluate(() => { const el = document.activeElement; if (!el || el === document.body) return "body"; const cs = getComputedStyle(el); return `${el.tagName.toLowerCase()}:${(el.innerText || el.getAttribute("aria-label") || el.id || "").trim().slice(0, 18)}|${cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? "ring" : "kein-ring"}`; })); }
    report.audit.push({ ansicht: name, pfad, status: res?.status(), dauerMs: dauer, kb: Math.round(bytes / 1024), fehler: errors, ...m, fokus });
  }
  await ctx.close();
}

});
// ---------- HARDEN: Randzustände ----------
async function shoot(page, name) { await page.screenshot({ path: `${out}${name}.png`, fullPage: true }); report.zustaende.push(name); }
await abschnitt("zustaende", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage();
  await page.goto(base + "/produkte?q=xyzzy-nichts"); await shoot(page, "z-suche-leer");
  await page.goto(base + "/produkte?kategorie=gibt-es-nicht"); await shoot(page, "z-kategorie-unbekannt");
  await page.goto(base + "/produkt/notizbuch-leinen-a5"); await shoot(page, "z-produkt-ausverkauft");
  await page.goto(base + "/produkt/pruefung-langer-titel"); await shoot(page, "z-produkt-langer-titel");
  await page.goto(base + "/produkte"); await shoot(page, "z-liste-mit-langen-namen");
  await page.goto(base + "/produkt/gibt-es-nicht"); await shoot(page, "z-404");
  await page.goto(base + "/warenkorb"); await shoot(page, "z-warenkorb-leer");
  await page.goto(base + "/produkt/pruefung-langer-titel"); await page.getByRole("button", { name: "In den Warenkorb" }).click(); await page.getByText("Liegt im Warenkorb").waitFor();
  await page.goto(base + "/warenkorb"); await shoot(page, "z-warenkorb-langer-titel");
  await page.goto(base + "/kasse"); await page.getByRole("button", { name: /Zahlungspflichtig bestellen/ }).click(); await page.locator("form [role=alert]").first().waitFor(); await shoot(page, "z-kasse-fehler");
  await page.goto(base + "/kasse?abgebrochen=1"); await shoot(page, "z-kasse-abgebrochen");
  await page.goto(base + "/macher/pruefung-langer-machername"); await shoot(page, "z-macher-langer-name");
  await page.goto(base + "/login"); await page.fill("#email", "nix@example.com"); await page.fill("#password", "falsch"); await page.getByRole("button", { name: "Anmelden" }).click(); await page.locator("[role=alert]").first().waitFor(); await shoot(page, "z-login-fehler");
  await page.goto(base + "/verkaufen"); await page.getByRole("button", { name: "Bewerbung absenden" }).click(); await page.locator("form [role=alert], .error").first().waitFor(); await shoot(page, "z-bewerbung-fehler");
  // 200 % Zoom
  await page.goto(base + "/produkt/sommerhonig-500-g"); await page.evaluate(() => { document.body.style.zoom = "2"; }); await shoot(page, "z-produkt-zoom200");
  await ctx.close();
});

// ---------- ONBOARD: neuer Macher von der Bewerbung bis zum ersten Produkt ----------
await abschnitt("onboard", async () => {
  const mail = `probe-${Date.now().toString(36)}@example.com`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const page = await ctx.newPage();
  await page.goto(base + "/verkaufen"); await shoot(page, "o1-verkaufen");
  await page.fill("#name", "Probewerkstatt"); await page.fill("#contactName", "Paula Probe"); await page.fill("#email", mail); await page.fill("#city", "Erkelenz"); await page.fill("#description", "Ich nähe Taschen aus alten Segeln.");
  await page.getByRole("button", { name: "Bewerbung absenden" }).click(); await page.locator("[role=status]").first().waitFor(); await shoot(page, "o2-bewerbung-gesendet");
  await ctx.close();
  // Team schaltet frei
  const a = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const ap = await a.newPage();
  await login(ap, admin);
  await ap.goto(base + "/admin/haendler?status=PENDING"); await shoot(ap, "o3-admin-bewerbungen");
  await ap.getByRole("link", { name: "Probewerkstatt" }).click(); await ap.waitForURL(/\/admin\/haendler\//); await shoot(ap, "o4-admin-bewerbung-detail");
  await ap.getByRole("button", { name: /Bewerbung annehmen/ }).click(); await ap.waitForTimeout(6000);
  await shoot(ap, "o5-admin-zugang");
  const body5 = await ap.textContent("body");
  const pw = body5.match(/nur jetzt sichtbar: ([A-Za-z0-9]+)/)?.[1];
  report.onboard.push({ schritt: "Freigeschaltet", passwortErkannt: Boolean(pw), auszug: pw ? undefined : body5.match(/.{0,60}(Freigeschaltet|fehlgeschlagen|Zugang|Fehler).{0,100}/g)?.slice(0, 3) });
  if (!pw) throw new Error("Kein Startpasswort auf der Seite");
  await a.close();
  // Neuer Macher meldet sich an
  const v = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const vp = await v.newPage();
  await login(vp, { email: mail, password: pw ?? "" });
  await shoot(vp, "o6-portal-leer");
  await vp.goto(base + "/portal/produkte"); await shoot(vp, "o7-produkte-leer");
  await vp.goto(base + "/portal/auszahlungen"); await shoot(vp, "o8-auszahlungen-leer");
  await vp.goto(base + "/portal/produkte/neu"); await shoot(vp, "o9-produkt-neu");
  await vp.fill("#title", "Segeltuchtasche groß"); await vp.fill("#price", "49"); await vp.fill("#stock", "3"); await vp.selectOption("#categoryId", { index: 1 });
  await vp.getByRole("button", { name: /zur Freigabe schicken/ }).click(); await vp.waitForURL(/\/portal\/produkte\/(?!neu)/); await shoot(vp, "o10-produkt-eingereicht");
  await vp.goto(base + "/portal"); await shoot(vp, "o11-portal-nach-erstem-produkt");
  await v.close();
});
await browser.close();
await aufraeumen();
await db.$disconnect();
await writeFile(`${out}bericht.json`, JSON.stringify(report, null, 2));
console.log(`Audit: ${report.audit.length} Seiten, Zustände: ${report.zustaende.length} Bilder, Onboard: ${JSON.stringify(report.onboard)}`);
if (report.fehler.length) console.log("Abgebrochen:", report.fehler.join("\n"));
