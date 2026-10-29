import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { BackofficeShell } from "@/components/ui/backoffice-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVendorUser();
  const vendor = await db.vendor.findUnique({ where: { id: user.vendorId }, select: { name: true } });
  return (
    <BackofficeShell
      title="Händlerbereich"
      subtitle={vendor?.name ?? user.email}
      links={[
        { href: "/portal", label: "Übersicht", exact: true },
        { href: "/portal/produkte", label: "Produkte" },
        { href: "/portal/bestellungen", label: "Verkäufe" },
        { href: "/portal/auszahlungen", label: "Auszahlungen" },
        { href: "/portal/einstellungen", label: "Einstellungen" },
      ]}
    >
      {children}
    </BackofficeShell>
  );
}
