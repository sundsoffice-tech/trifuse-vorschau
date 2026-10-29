import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorForAdmin } from "@/modules/vendors/service";
import { vendorPayoutSummary } from "@/modules/payouts/service";
import { adminDeleteVendorAction } from "@/modules/vendors/admin-actions";
import { formatCents } from "@/lib/money";
import { AdminVendorEditForm, AdminResetPasswordForm } from "@/components/forms/admin-vendor-forms";
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
        <Link href="/admin/haendler" className="text-sm text-ink-3">← Händler</Link>
        <h1 className="font-display text-3xl font-semibold mt-1">{vendor.name}</h1>
        <div className="mt-2 flex items-center gap-3"><StatusBadge status={vendor.status} kind="vendor" /><Link href={`/admin/produkte?q=${encodeURIComponent(vendor.name)}`} className="text-sm text-accent">{vendor._count.products} Produkte</Link><Link href={`/haendler/${vendor.slug}`} className="text-sm text-accent" target="_blank">Markenseite</Link></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Offen zur Auszahlung" value={formatCents(payout.openCents)} hint={`${payout.open.length} Positionen`} />
        <Stat label="Ausgezahlt" value={formatCents(payout.paidCents)} hint={`${payout.payouts.length} Auszahlungen`} />
      </div>
      <AdminVendorEditForm vendor={vendor} />
      <section className="card p-5 md:p-6 space-y-3">
        <h2 className="font-semibold text-lg">Zugänge</h2>
        {vendor.users.map((u) => <AdminResetPasswordForm key={u.id} user={u} />)}
      </section>
      {vendor.status !== "ACTIVE" ? (
        <form action={adminDeleteVendorAction} className="card p-5 flex items-center justify-between gap-4">
          <input type="hidden" name="vendorId" value={vendor.id} />
          <p className="text-sm text-ink-2">Händler samt Produkten und Zugängen löschen. Nur möglich, wenn es keine Verkäufe gibt.</p>
          <button className="btn btn-danger btn-sm" type="submit">Löschen</button>
        </form>
      ) : null}
    </div>
  );
}
