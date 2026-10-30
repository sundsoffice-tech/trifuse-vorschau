// Durchlauf gegen einen laufenden Server: Shop, Kauf im Testmodus, Händlerportal, Admin-Freigabe, Auszahlung.
// Aufruf: node test/smoke.mjs http://localhost:3000
// Schreibt Screenshots (hell/dunkel, schmal/breit) nach test/ergebnisse/.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

// Playwright kann global installiert sein (NODE_PATH); createRequire findet es auch dann.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");
let probe = null; // Testfoto, in Abschnitt 3 erzeugt, in Abschnitt 4 gegen die Varianten gemessen

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

// 1b. Grundpreis nach Preisangabenverordnung steht an Karte und Produktseite
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/produkte?q=Sommerhonig");
  check((await page.textContent("body"))?.replace(/\u00a0/g, " ").includes("17,80 €/kg") ?? false, "Grundpreis auf der Produktkarte (Honig 500 g: 17,80 €/kg)");
  await page.goto(base + "/produkte?q=Kernseife");
  check((await page.textContent("body"))?.replace(/\u00a0/g, " ").includes("5,90 €/100 g") ?? false, "Grundpreis je 100 g bei kleinen Mengen");
  await page.locator("article a").first().click();
  await page.waitForURL(/\/produkt\//);
  check((await page.textContent("body"))?.includes("Inhalt: 100 g") ?? false, "Inhalt auf der Produktseite");
  const api = await (await fetch(base + "/api/v1/products?q=Sommerhonig")).json();
  check(api.items?.[0]?.basePrice?.cents === 1780 && api.items[0].basePrice.per === "kg", "API liefert den Grundpreis");
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
  // Zwei Stück, damit am Ende eine Teil-Rückgabe (1 von 2) möglich ist und der Saldo des Machers positiv bleibt
  await page.selectOption("form select[name=quantity]", "2");
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
  // Ein großes Handyfoto (2400 x 1800 JPEG) hochladen; der Server macht daraus WebP in festen Breiten.
  probe = await sharp({ create: { width: 2400, height: 1800, channels: 3, noise: { type: "gaussian", mean: 140, sigma: 40 } } }).jpeg({ quality: 92 }).toBuffer(); // Rauschen wie ein echtes Foto, sonst wäre die Größe kein Maßstab
  await page.setInputFiles("#images", { name: "handyfoto.jpg", mimeType: "image/jpeg", buffer: probe });
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
  {
    const api = await (await fetch(base + "/api/v1/products?q=" + encodeURIComponent(newProductTitle))).json();
    const v = api.items?.[0]?.imageVariants ?? {};
    check(typeof v.w320 === "string" && v.w320.endsWith("-w320.webp") && typeof v.master === "string", `Bild liegt in Größen vor: ${Object.keys(v).join(", ")}`);
    const res = await fetch(base + v.w320);
    const buf = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buf).metadata();
    check(res.headers.get("content-type") === "image/webp" && meta.width === 320 && meta.height === 240, `Kartenbild ist WebP ${meta.width}x${meta.height}, ${Math.round(buf.length / 1024)} KB (Original ${Math.round(probe.length / 1024)} KB)`);
    check(buf.length < probe.length / 10, "Kartenbild ist mindestens zehnmal kleiner als das Original");
    const master = await sharp(Buffer.from(await (await fetch(base + v.master)).arrayBuffer())).metadata();
    check(master.width === 2000 && master.height === 1500, `Master auf 2000 px begrenzt (${master.width}x${master.height})`);
  }
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
    // Sammeldatei: der Entwurf steht drin, danach ist er als exportiert markiert
    const sepa = await page.request.get(base + "/api/admin/auszahlungen/sepa");
    const xml = await sepa.text();
    check(sepa.status() === 200 && xml.includes("pain.001.001.09") && xml.includes("<IBAN>DE75512108001245126199</IBAN>") && /<NbOfTxs>\d+<\/NbOfTxs>/.test(xml), `SEPA-Datei für Entwürfe (${sepa.status()})`);
    const sepa2 = await page.request.get(base + "/api/admin/auszahlungen/sepa");
    check(sepa2.status() === 404, "Zweiter Abruf ohne neue Entwürfe liefert keine Datei (Schutz vor Doppelüberweisung)");
    const csv = await page.request.get(base + "/api/admin/auszahlungen/export?art=positionen&von=2020-01-01&bis=2099-12-31");
    const text = await csv.text();
    check(csv.status() === 200 && text.startsWith("\ufeffDatum;Art;Bestellung") && text.includes(orderNumber), "Buchhaltungs-CSV enthält die Bestellung");
    await page.fill("input[name=reference]", "SMOKE-UEBERWEISUNG");
    await page.getByRole("button", { name: "Als überwiesen markieren" }).click();
    await page.waitForLoadState("networkidle");
    check((await page.textContent("body"))?.includes("Diese Auszahlung ist überwiesen") ?? false, "Auszahlung als überwiesen markiert");
  } else {
    check((await page.textContent("body"))?.includes("Verrechnet, es war keine Überweisung nötig") ?? false, "Saldo null: Verkauf und vorgetragene Rückgabe verrechnet, keine Überweisung");
  }
  await page.goto(base + "/admin/bestellungen");
  await shoot(page, "admin-bestellungen");
  // Postausgang: Bestellbestätigung an den Käufer und Verkaufsmeldung an den Macher sind raus (Dateimodus)
  await page.goto(base + "/admin/postausgang");
  const post = await page.textContent("body");
  check((post?.includes(`Deine Bestellung ${orderNumber} ist eingegangen`) && post.includes("kunde@example.com")) ?? false, "Bestellbestätigung im Postausgang");
  check(post?.includes(`(${orderNumber})`) && post.includes("wiesenkram@example.com") || false, "Verkaufsmeldung an den Macher im Postausgang");
  check(!post?.includes("Fehlgeschlagen (") || post.includes("Fehlgeschlagen (0)"), "Keine fehlgeschlagene Mail");
  await shoot(page, "admin-postausgang");
  // Rückgabe nach der Auszahlung: Rückbuchung entsteht, Geld simuliert zurück, Saldo beim Macher negativ
  await page.goto(base + "/admin/bestellungen?status=PAID");
  await page.getByRole("link", { name: orderNumber }).click();
  await page.waitForURL(/\/admin\/bestellungen\/[a-z0-9]+/);
  await page.locator("summary", { hasText: "Zurückbuchen" }).first().click();
  const rueckgabeForm = page.locator("form:has(input[name=itemId])").first();
  await rueckgabeForm.locator("select[name=quantity]").selectOption("1");
  await rueckgabeForm.getByRole("button", { name: "Zurückbuchen" }).click();
  await page.waitForLoadState("networkidle");
  const nachRueckgabe = await page.textContent("body");
  check(nachRueckgabe?.includes("Rückbuchungen") && nachRueckgabe.includes("zurückgezahlt") && nachRueckgabe.includes("in nächster Auszahlung"), "Teil-Rückgabe gebucht, Testrückzahlung vermerkt, wartet auf nächste Auszahlung");
  check((nachRueckgabe?.includes("1 von 2 offen") && !nachRueckgabe.includes("Vollständig erstattet")) ?? false, "Nach 1 von 2 bleibt die Bestellung bezahlt, ein Stück ist noch offen");
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

// 4c. Passwort vergessen: Mail landet als Datei, Link funktioniert, neues Passwort meldet an
{
  const { readdir, readFile } = await import("node:fs/promises");
  const mailDir = new URL("../data/mails/", import.meta.url).pathname;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.getByRole("link", { name: "Passwort vergessen?" }).click();
  await page.waitForURL(/\/passwort-vergessen/);
  await page.fill("#email", vendor.email);
  await page.getByRole("button", { name: "Link schicken" }).click();
  await page.getByText("ist eine Mail mit einem Link unterwegs").waitFor();
  await shoot(page, "passwort-vergessen");
  let link = null;
  for (let i = 0; i < 20 && !link; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const files = (await readdir(mailDir).catch(() => [])).filter((f) => f.endsWith(".json")).sort().reverse();
    for (const f of files.slice(0, 10)) {
      const m = JSON.parse(await readFile(mailDir + f, "utf8"));
      if (m.to === vendor.email && /passwort-neu/.test(m.text)) { link = m.text.match(/https?:\/\/\S+\/passwort-neu\/\S+/)?.[0]; break; }
    }
  }
  check(Boolean(link), "Passwort-Mail als Datei abgelegt, Link gefunden");
  await page.goto(link.replace(/^https?:\/\/[^/]+/, base));
  await page.fill("#password", vendor.password);
  await page.fill("#confirm", vendor.password);
  await shoot(page, "passwort-neu");
  await page.getByRole("button", { name: "Passwort festlegen und anmelden" }).click();
  await page.waitForURL(/\/portal/);
  check(page.url().includes("/portal"), "Nach neuem Passwort direkt im Macherbereich");
  const again = await page.goto(link.replace(/^https?:\/\/[^/]+/, base));
  check((await page.textContent("body"))?.includes("abgelaufen oder schon benutzt") ?? false, `Benutzter Link ist entwertet (${again?.status()})`);
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
