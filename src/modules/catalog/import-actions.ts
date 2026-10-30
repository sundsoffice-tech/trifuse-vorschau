"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/session";
import { checkImport, runImport, type ImportRow } from "./import-service";

export type ImportState = { step: "check" | "done"; text: string; rows: ImportRow[]; missing: string[]; created?: number; skipped?: number; message?: string } | null;

async function readText(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) throw new Error("Datei größer als 2 MB.");
    return Buffer.from(await file.arrayBuffer()).toString("utf8");
  }
  const text = formData.get("text");
  return typeof text === "string" ? text : "";
}

export async function importCheckAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  try {
    const text = await readText(formData);
    if (!text.trim()) return { step: "check", text: "", rows: [], missing: [], message: "Bitte eine CSV-Datei wählen oder Zeilen einfügen." };
    const { rows, missing } = await checkImport(text);
    return { step: "check", text, rows, missing, message: missing.length ? `Spalten fehlen: ${missing.join(", ")}` : undefined };
  } catch (e) {
    return { step: "check", text: "", rows: [], missing: [], message: e instanceof Error ? e.message : "Datei konnte nicht gelesen werden." };
  }
}

export async function importRunAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const text = typeof formData.get("text") === "string" ? (formData.get("text") as string) : "";
  const result = await runImport(text);
  revalidatePath("/admin/produkte");
  revalidatePath("/", "layout");
  return { step: "done", text, rows: result.rows, missing: [], created: result.created, skipped: result.skipped };
}
