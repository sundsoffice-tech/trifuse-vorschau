import type { FulfillmentStatus, ShippingBy, ReversalReason } from "@prisma/client";

/** Was der Macher zu einem Verkauf wissen muss: ob er etwas tun muss (Künstler-Fund 29). */
export function fulfillmentText(status: FulfillmentStatus, shippingBy: ShippingBy): string {
  if (shippingBy === "WAREHOUSE") {
    if (status === "NEW" || status === "PACKED") return "Wir verschicken, du musst nichts tun";
    if (status === "SHIPPED") return "Von uns verschickt";
    if (status === "DELIVERED") return "Zugestellt";
    return "Zurückgeschickt";
  }
  if (status === "NEW" || status === "PACKED") return "Bitte verschicken und als verschickt markieren";
  if (status === "SHIPPED") return "Von dir verschickt";
  if (status === "DELIVERED") return "Zugestellt";
  return "Zurückgeschickt";
}

/** Nächster Auszahlungstermin aus dem Einstellungstext, z. B. „jeweils zum 15. des Folgemonats“ (Künstler-Fund 23). */
export function nextPayoutDate(schedule: string, now = new Date()): Date | null {
  const m = schedule.match(/(\d{1,2})\./);
  if (!m) return null;
  const day = Math.min(28, parseInt(m[1], 10));
  const folgemonat = /folgemonat/i.test(schedule);
  let d = new Date(now.getFullYear(), now.getMonth() + (folgemonat ? 1 : 0), day);
  if (!folgemonat && d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return d;
}

export function formatPayoutDate(schedule: string): string {
  const d = nextPayoutDate(schedule);
  return d ? `voraussichtlich am ${d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}` : schedule;
}

export function reversalReasonText(reason: ReversalReason): string {
  return reason === "RETURN" ? "Rückgabe" : reason === "GOODWILL" ? "Kulanz" : "Erstattung";
}
