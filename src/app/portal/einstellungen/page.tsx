import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { VendorSettingsForm, PasswordForm } from "@/components/forms/vendor-settings-form";

export default async function PortalSettings() {
  const user = await requireVendorUser();
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
  return (
    <div className="space-y-8 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Einstellungen</h1><p className="text-ink-2">Markenauftritt, Kontakt und Bankverbindung.</p></div>
      <VendorSettingsForm vendor={{ name: vendor.name, description: vendor.description, phone: vendor.phone, addressLine: vendor.addressLine, postalCode: vendor.postalCode, city: vendor.city, payoutHolder: vendor.payoutHolder, payoutIban: vendor.payoutIban, logoPath: vendor.logoPath, commissionPercent: vendor.commissionPercent, email: vendor.email }} />
      <PasswordForm />
    </div>
  );
}
