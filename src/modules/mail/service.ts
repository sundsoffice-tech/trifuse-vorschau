import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getMailTransport } from "./transport";
import type { MailContent } from "./templates";

const MAX_ATTEMPTS = 5;
const STUCK_AFTER_MS = 10 * 60 * 1000;

/** Legt die Mail in den Postausgang und stößt die Zustellung nach der Antwort an. */
export async function queueMail(to: string, content: MailContent, relatedId = "") {
  const row = await db.mailOutbox.create({ data: { to, subject: content.subject, text: content.text, html: content.html, template: content.template, relatedId } });
  scheduleDelivery();
  return row;
}

export function scheduleDelivery() {
  try {
    after(() => deliverQueued());
  } catch {
    // Außerhalb eines Requests (Skripte): sofort, ohne zu warten.
    void deliverQueued();
  }
}

/**
 * Stellt wartende Mails zu. Jede Mail wird über den Statuswechsel QUEUED -> SENDING beansprucht, damit
 * zwei Instanzen nie dieselbe Mail senden. Hängt eine Mail länger als zehn Minuten in SENDING (Absturz),
 * wird sie wieder freigegeben.
 */
export async function deliverQueued(limit = 20) {
  const transport = getMailTransport();
  if (!transport) return { sent: 0, failed: 0, skipped: true };
  await db.mailOutbox.updateMany({ where: { status: "SENDING", claimedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } }, data: { status: "QUEUED" } });
  const rows = await db.mailOutbox.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, take: limit });
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const claimed = await db.mailOutbox.updateMany({ where: { id: row.id, status: "QUEUED" }, data: { status: "SENDING", claimedAt: new Date() } });
    if (claimed.count === 0) continue;
    try {
      const { messageId } = await transport.send(row);
      await db.mailOutbox.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), messageId, attempts: { increment: 1 }, lastError: "" } });
      sent++;
    } catch (e) {
      const attempts = row.attempts + 1;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Mail ${row.id} an ${row.to} fehlgeschlagen (Versuch ${attempts}):`, message);
      await db.mailOutbox.update({ where: { id: row.id }, data: { status: attempts >= MAX_ATTEMPTS ? "FAILED" : "QUEUED", attempts, lastError: message.slice(0, 500) } });
      failed++;
    }
  }
  return { sent, failed, skipped: false };
}

/** Admin: fehlgeschlagene Mail noch einmal in die Warteschlange. */
export async function requeueMail(id: string) {
  await db.mailOutbox.update({ where: { id }, data: { status: "QUEUED", attempts: 0, lastError: "" } });
  scheduleDelivery();
}
