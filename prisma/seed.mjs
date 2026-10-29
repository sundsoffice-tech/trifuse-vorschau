// Startdaten: Admin-Zugang (immer), Demo-Haendler und Demo-Produkte (nur bei leerer Datenbank).
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

function slugify(input) {
  return input.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "bitte-aendern";
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: hashPassword(adminPassword), name: "Marktplatz-Team", role: "ADMIN" },
  });
  console.log(`Admin: ${adminEmail}`);

  const categories = ["Wohnen", "Küche", "Körper & Pflege", "Papier & Schreiben", "Textil", "Geschenke"];
  for (const [i, name] of categories.entries()) {
    const slug = slugify(name);
    await db.category.upsert({ where: { slug }, update: {}, create: { slug, name, sortOrder: i + 1 } });
  }

  if (process.env.SEED_DEMO === "0" || (await db.vendor.count()) > 0) {
    console.log("Demo-Daten übersprungen.");
    return;
  }

  const demoPassword = "haendler-demo-2026";
  const vendors = [
    { slug: "lichtwerk-mg", name: "Lichtwerk MG", email: "lichtwerk@example.com", city: "Mönchengladbach", description: "Lea gießt Kerzen aus Rapswachs in ihrer Werkstatt in Rheydt. Jede Kerze wird von Hand gegossen, geduldig abgekühlt und einzeln geprüft.", contact: "Lea Brandt", iban: "DE02120300000000202051" },
    { slug: "ton-und-tisch", name: "Ton & Tisch", email: "tonundtisch@example.com", city: "Viersen", description: "Milan dreht Steinzeug für den Alltag: Schalen, Becher, Bretter. Alles entsteht an der Scheibe in Viersen und wird zweimal gebrannt.", contact: "Milan Oster", iban: "" },
    { slug: "wiesenkram", name: "Wiesenkram", email: "wiesenkram@example.com", city: "Niederrhein", description: "Hanna führt einen kleinen Hof am Niederrhein: Bienen, Kräuterbeete, eine Seifenküche. Was sie dort macht, verkauft sie hier.", contact: "Hanna Vogt", iban: "DE75512108001245126199" },
  ];
  const created = {};
  for (const v of vendors) {
    created[v.slug] = await db.vendor.create({
      data: { slug: v.slug, name: v.name, email: v.email, city: v.city, description: v.description, status: "ACTIVE", commissionPercent: 15, autoApprove: false, payoutHolder: v.contact, payoutIban: v.iban, users: { create: { email: v.email, name: v.contact, role: "VENDOR", passwordHash: hashPassword(demoPassword) } } },
    });
  }
  const cat = async (slug) => (await db.category.findUnique({ where: { slug } }))?.id ?? null;
  const products = [
    ["lichtwerk-mg", "Rapswachskerze Terrakotta", 1890, 2290, 24, "wohnen", "kerze", "Handgegossen in einen Terrakotta-Becher, Brenndauer rund 40 Stunden. Duftfrei, rußarm, der Becher lässt sich nachfüllen."],
    ["lichtwerk-mg", "Stabkerzen Set Sand", 1450, null, 40, "wohnen", "kerze", "Sechs Stabkerzen aus Rapswachs, 25 cm, gedeckter Sandton."],
    ["ton-und-tisch", "Müsli-Schale Salbei", 2400, null, 12, "kueche", "schale", "Steinzeug, 14 cm Durchmesser, spülmaschinenfest. Glasur Salbeigrün."],
    ["ton-und-tisch", "Servierbrett Eiche", 3900, 4500, 6, "kueche", "brett", "Geöltes Eichenholz mit Lederschlaufe, 40 x 18 cm."],
    ["wiesenkram", "Sommerhonig 500 g", 890, null, 60, "geschenke", "honig", "Blütenhonig aus eigener Imkerei, cremig gerührt."],
    ["wiesenkram", "Kräutertee Abendruhe", 690, null, 35, "kueche", "tee", "Melisse, Lavendel und Apfelminze, 50 g lose."],
    ["wiesenkram", "Kernseife Ringelblume", 590, null, 80, "koerper-pflege", "seife", "Kaltgerührt, ohne Palmöl, 100 g."],
    ["ton-und-tisch", "Notizbuch Leinen A5", 1290, null, 0, "papier-schreiben", "notizbuch", "Fadenheftung, 160 Seiten blanko, Leineneinband. Zurzeit ausverkauft."],
    ["lichtwerk-mg", "Baumwolltasche Lichtwerk", 990, null, 30, "textil", "tasche", "Bio-Baumwolle, langer Henkel, Siebdruck in Terrakotta."],
  ];
  for (const [vslug, title, price, compare, stock, cslug, img, desc] of products) {
    const slug = slugify(title);
    await db.product.create({
      data: { vendorId: created[vslug].id, slug, title, description: desc, priceCents: price, compareAtCents: compare, stock, status: "ACTIVE", categoryId: await cat(cslug), images: { create: [{ path: `/demo/${img}.svg`, alt: title, sortOrder: 0 }] } },
    });
  }
  await db.product.create({
    data: { vendorId: created["wiesenkram"].id, slug: "lippenbalsam-honig", title: "Lippenbalsam Honig", description: "Bienenwachs und Sonnenblumenöl, 10 ml.", priceCents: 450, stock: 50, status: "PENDING", categoryId: await cat("koerper-pflege"), images: { create: [{ path: "/demo/honig.svg", alt: "Lippenbalsam", sortOrder: 0 }] } },
  });
  console.log(`Demo-Händler angelegt (Passwort für alle: ${demoPassword}): ${vendors.map((v) => v.email).join(", ")}`);
}

main().finally(() => db.$disconnect());
