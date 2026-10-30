import { db } from "@/lib/db";
import { requireAdmin } from "@/modules/auth/session";
import { getSetting } from "@/lib/settings";
import { isValidIban } from "@/lib/iban";
import { buildPain001 } from "@/lib/sepa";
import { payoutReference } from "@/modules/payouts/texts";

/**
 * SEPA-Sammelüberweisung (pain.001.001.09) für alle Entwürfe mit Bankverbindung und positivem Betrag.
 * Die Datei wird im Online-Banking hochgeladen; danach markiert der Admin die Auszahlungen als überwiesen.
 * Jeder Entwurf merkt sich den Export, damit niemand dieselbe Datei zweimal erzeugt, ohne es zu sehen.
 */
export async function GET(req: Request) {
  await requireAdmin();
  const [name, iban, bic] = await Promise.all([getSetting("payout_debtor_name"), getSetting("payout_debtor_iban"), getSetting("payout_debtor_bic")]);
  if (!name || !isValidIban(iban)) return new Response("Unser Konto für Auszahlungen fehlt oder die IBAN ist ungültig. Bitte unter Einstellungen eintragen.", { status: 400 });
  const again = new URL(req.url).searchParams.get("erneut") === "1";
  const drafts = await db.payout.findMany({
    where: { status: "DRAFT", totalCents: { gt: 0 }, ...(again ? {} : { sepaExportedAt: null }) },
    include: { vendor: { select: { name: true, payoutIban: true, payoutHolder: true } } },
    orderBy: { createdAt: "asc" },
  });
  const ready = drafts.filter((p) => isValidIban(p.vendor.payoutIban));
  if (ready.length === 0) return new Response(again ? "Keine Entwürfe mit gültiger Bankverbindung." : "Keine neuen Entwürfe. Schon exportierte Entwürfe noch einmal: ?erneut=1", { status: 404 });
  const now = new Date();
  const msgId = `TRIFUSE-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${now.getTime().toString(36).toUpperCase()}`;
  const xml = buildPain001({
    msgId,
    createdAt: now,
    executionDate: now.toISOString().slice(0, 10),
    debtor: { name, iban, bic: bic || undefined },
    transfers: ready.map((p) => ({
      endToEndId: p.id,
      name: p.vendor.payoutHolder || p.vendor.name,
      iban: p.vendor.payoutIban,
      amountCents: p.totalCents,
      remittance: p.reference || payoutReference(p.createdAt, p.vendor.name),
    })),
  });
  await db.payout.updateMany({ where: { id: { in: ready.map((p) => p.id) } }, data: { sepaExportedAt: now } });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="sepa-auszahlungen-${now.toISOString().slice(0, 10)}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
