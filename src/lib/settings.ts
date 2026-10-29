import { db } from "@/lib/db";

export type SettingKey =
  | "commission_percent"
  | "shipping_flat_cents"
  | "free_shipping_from_cents";

const defaults: Record<SettingKey, string> = {
  commission_percent: process.env.DEFAULT_COMMISSION_PERCENT ?? "15",
  shipping_flat_cents: process.env.SHIPPING_FLAT_CENTS ?? "490",
  free_shipping_from_cents: process.env.FREE_SHIPPING_FROM_CENTS ?? "7500",
};

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? defaults[key];
}

export async function getSettingNumber(key: SettingKey): Promise<number> {
  const n = Number(await getSetting(key));
  return Number.isFinite(n) ? n : Number(defaults[key]);
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function getAllSettings() {
  return {
    commissionPercent: await getSettingNumber("commission_percent"),
    shippingFlatCents: await getSettingNumber("shipping_flat_cents"),
    freeShippingFromCents: await getSettingNumber("free_shipping_from_cents"),
  };
}
