import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

export type OutgoingMail = { id: string; to: string; subject: string; text: string; html: string };
export interface MailTransport {
  readonly id: "smtp" | "file" | "off";
  send(mail: OutgoingMail): Promise<{ messageId: string }>;
}

export type MailMode = "smtp" | "file" | "off";

/** smtp: echter Versand. file: schreibt jede Mail als JSON nach data/mails (Entwicklung, Tests). off: nichts geht raus, bleibt im Postausgang. */
export function mailMode(): MailMode {
  const m = process.env.MAIL_MODE;
  if (m === "smtp") return process.env.SMTP_HOST ? "smtp" : "off";
  if (m === "off") return "off";
  return "file";
}

export function mailFrom() {
  return process.env.MAIL_FROM || `trifuse.store <${process.env.SUPPORT_EMAIL ?? "service@trifuse.store"}>`;
}

// Fester Pfad wie bei den Bildern, damit das Tracing des Standalone-Builds nicht stolpert.
export const MAIL_FILE_DIR = path.join(process.cwd(), "data", "mails");

const fileTransport: MailTransport = {
  id: "file",
  async send(mail) {
    await mkdir(MAIL_FILE_DIR, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${mail.id}.json`;
    await writeFile(path.join(MAIL_FILE_DIR, name), JSON.stringify({ from: mailFrom(), ...mail, at: new Date().toISOString() }, null, 2));
    return { messageId: name };
  },
};

let smtp: nodemailer.Transporter | null = null;
const smtpTransport: MailTransport = {
  id: "smtp",
  async send(mail) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    smtp ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    });
    const info = await smtp.sendMail({ from: mailFrom(), to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    return { messageId: String(info.messageId ?? "") };
  },
};

export function getMailTransport(): MailTransport | null {
  const mode = mailMode();
  return mode === "smtp" ? smtpTransport : mode === "file" ? fileTransport : null;
}
