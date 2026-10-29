import { requireAdmin } from "@/modules/auth/session";
import { BackofficeShell } from "@/components/ui/backoffice-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <BackofficeShell
      title="Verwaltung"
      subtitle={user.email}
      links={[
        { href: "/admin", label: "Übersicht", exact: true },
        { href: "/admin/produkte", label: "Produkte" },
        { href: "/admin/haendler", label: "Macher" },
        { href: "/admin/bestellungen", label: "Bestellungen" },
        { href: "/admin/auszahlungen", label: "Auszahlungen" },
        { href: "/admin/kategorien", label: "Kategorien" },
        { href: "/admin/einstellungen", label: "Einstellungen" },
      ]}
    >
      {children}
    </BackofficeShell>
  );
}
