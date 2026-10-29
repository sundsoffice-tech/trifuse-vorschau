import "server-only";
import { db } from "@/lib/db";
import { slugify, randomSuffix } from "@/lib/slug";
import { hashPassword, generatePassword } from "@/lib/password";
import { getSettingNumber } from "@/lib/settings";
import type { VendorStatus } from "@prisma/client";

async function uniqueVendorSlug(name: string) {
  const base = slugify(name);
  let candidate = base;
  for (let i = 0; i < 10; i++) {
    if (!(await db.vendor.findUnique({ where: { slug: candidate } }))) return candidate;
    candidate = `${base}-${randomSuffix()}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type NewVendor = {
  name: string;
  email: string;
  phone?: string;
  description?: string;
  contactName: string;
  password?: string;
  status: VendorStatus;
};

/** Legt Händler plus ersten Benutzer an. Liefert das Startpasswort zurück, falls es erzeugt wurde. */
export async function createVendorWithUser(input: NewVendor) {
  const email = input.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new Error("Für diese E-Mail gibt es schon einen Zugang.");
  const password = input.password ?? generatePassword();
  const passwordHash = await hashPassword(password);
  const commissionPercent = await getSettingNumber("commission_percent");
  const vendor = await db.vendor.create({
    data: {
      name: input.name,
      slug: await uniqueVendorSlug(input.name),
      email,
      phone: input.phone ?? "",
      description: input.description ?? "",
      status: input.status,
      commissionPercent,
      users: { create: { email, passwordHash, name: input.contactName, role: "VENDOR" } },
    },
  });
  return { vendor, password: input.password ? null : password };
}

export async function listVendorsForAdmin() {
  return db.vendor.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, orderItems: true } }, users: { select: { email: true, name: true } } },
  });
}

export async function getVendorForAdmin(id: string) {
  return db.vendor.findUnique({
    where: { id },
    include: { users: { select: { id: true, email: true, name: true } }, _count: { select: { products: true } } },
  });
}
