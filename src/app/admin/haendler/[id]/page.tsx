import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorForAdmin } from "@/modules/vendors/service";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { adminDeleteVendorAction } from "@/modules/vendors/admin-actions";
import { formatCents } from "@/lib/money";
import { plural } from "@/lib/text";
import { AdminVendorEditForm, AdminResetPasswordForm, AdminCreateAccessForm, AdminApproveForm } from "@/components/forms/admin-vendor-forms";
import { StatusBadge } from "@/components/ui/status-badge";
import { Stat } from "@/components/ui/stat";

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
      <section className={vendor.status === "PENDING" ? "card p-5 space-y-3 border-warn/40 bg-warn-soft/30" : "empty:hidden"}>
        {vendor.status === "PENDING" ? (
          <>
            <p className="font-semibold">Bewerbung von {vendor.payoutHolder || vendor.email}{vendor.city ? ` aus ${vendor.city}` : ""}</p>
            <p className="text-ink-2">„{vendor.description}“{vendor.website ? <> · <a href={vendor.website} className="text-accent-text underline" target="_blank" rel="noopener">Arbeit ansehen</a></> : null}</p>
          </>
        ) : null}
        <AdminApproveForm vendorId={vendor.id} email={vendor.email} pending={vendor.status === "PENDING"} />
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Noch zu überweisen" value={formatCents(payout.openCents)} hint={plural(payout.open.length, "Verkauf", "Verkäufe")} />
        <Stat label="Überwiesen" value={formatCents(payout.paidCents)} hint={plural(payout.payouts.length, "Auszahlung", "Auszahlungen")} />
      </div>
      <AdminVendorEditForm key={`${vendor.status}-${vendor.updatedAt.getTime()}`} vendor={vendor} />
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
