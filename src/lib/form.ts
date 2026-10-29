export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;

export function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function intField(formData: FormData, name: string, fallback = 0): number {
  const n = parseInt(field(formData, name), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function floatField(formData: FormData, name: string, fallback = 0): number {
  const n = parseFloat(field(formData, name).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
