import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { VendorSettingsForm, PasswordForm } from "@/components/forms/vendor-settings-form";

export default async function PortalSettings() {
  const user = await requireVendorUser();
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
  return (
    <div className="space-y-8 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Einstellungen</h1><p className="text-ink-2">Wie du im Shop erscheinst, wie wir dich erreichen, wohin das Geld geht.</p></div>
      <VendorSettingsForm vendor={{ name: vendor.name, description: vendor.description, phone: vendor.phone, addressLine: vendor.addressLine, postalCode: vendor.postalCode, city: vendor.city, website: vendor.website, payoutHolder: vendor.payoutHolder, payoutIban: vendor.payoutIban, logoPath: vendor.logoPath, commissionPercent: vendor.commissionPercent, email: vendor.email, manufacturerName: vendor.manufacturerName, manufacturerAddress: vendor.manufacturerAddress, manufacturerEmail: vendor.manufacturerEmail }} />
      <PasswordForm />
    </div>
  );
}
