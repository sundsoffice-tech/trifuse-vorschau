import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const dir = new URL("./", import.meta.url).pathname;
const browser = await chromium.launch();
for (const f of ["a-kassenbon", "b-packband", "c-marktschild"]) {
  for (const [name, vp] of [["desktop", { width: 1280, height: 900 }], ["mobil", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: name === "mobil" ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto("file://" + dir + f + ".html", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${dir}${f}-${name}.png`, fullPage: name === "desktop" });
    await ctx.close();
  }
}
await browser.close();
console.log("ok");
