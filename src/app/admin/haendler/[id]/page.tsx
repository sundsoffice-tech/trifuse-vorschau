import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorForAdmin } from "@/modules/vendors/service";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { adminDeleteVendorAction } from "@/modules/vendors/admin-actions";
import { formatCents } from "@/lib/money";
import { plural } from "@/lib/text";
import { AdminVendorEditForm, AdminResetPasswordForm, AdminCreateAccessForm } from "@/components/forms/admin-vendor-forms";
import { StatusBadge } from "@/components/ui/status-badge";
import { Stat } from "@/components/ui/stat";
import { Alert } from "@/components/ui/alert";

export default async function AdminVendorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await getVendorForAdmin(id);
  if (!vendor) notFound();
  const payout = await vendorPayoutSummary(id);
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/haendler" className="text-sm text-ink-2 hover:underline">← Macher</Link>
        <h1 className="font-display text-3xl font-semibold mt-1">{vendor.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3"><StatusBadge status={vendor.status} kind="vendor" /><Link href={`/admin/produkte?q=${encodeURIComponent(vendor.name)}`} className="text-sm text-accent-text font-semibold">{plural(vendor._count.products, "Produkt", "Produkte")}</Link><Link href={`/macher/${vendor.slug}`} className="text-sm text-accent-text font-semibold" target="_blank">Seite im Shop</Link>{vendor.website ? <a href={vendor.website} className="text-sm text-accent-text font-semibold" target="_blank" rel="noopener">Arbeit ansehen</a> : null}</div>
      </div>
      {vendor.status === "PENDING" ? <Alert tone="warn">Bewerbung von {vendor.payoutHolder || vendor.email}{vendor.city ? ` aus ${vendor.city}` : ""}: „{vendor.description}“ Zum Freischalten unten den Stand auf „Aktiv“ setzen und einen Zugang anlegen.</Alert> : null}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Noch zu überweisen" value={formatCents(payout.openCents)} hint={plural(payout.open.length, "Verkauf", "Verkäufe")} />
        <Stat label="Überwiesen" value={formatCents(payout.paidCents)} hint={plural(payout.payouts.length, "Auszahlung", "Auszahlungen")} />
      </div>
      <AdminVendorEditForm vendor={vendor} />
      <section className="card p-5 md:p-6 space-y-3">
        <h2 className="font-semibold text-lg">Zugänge</h2>
        {vendor.users.length === 0 ? <AdminCreateAccessForm vendorId={vendor.id} email={vendor.email} /> : null}
        {vendor.users.map((u) => <AdminResetPasswordForm key={u.id} user={u} />)}
      </section>
      {vendor.status !== "ACTIVE" ? (
        <form action={adminDeleteVendorAction} className="card p-5 flex items-center justify-between gap-4">
          <input type="hidden" name="vendorId" value={vendor.id} />
          <p className="text-sm text-ink-2">Macher samt Produkten und Zugängen löschen. Nur möglich, wenn es keine Verkäufe gibt.</p>
          <button className="btn btn-danger btn-sm" type="submit">Löschen</button>
        </form>
      ) : null}
    </div>
  );
}
