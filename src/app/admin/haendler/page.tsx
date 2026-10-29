import Link from "next/link";
import { listVendorsForAdmin } from "@/modules/vendors/service";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function AdminVendors({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const all = await listVendorsForAdmin();
  const vendors = status ? all.filter((v) => v.status === status) : all;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Macher</h1>
        <Link href="/admin/haendler/neu" className="btn btn-primary">Macher anlegen</Link>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[["", "Alle"], ["PENDING", "Bewerbungen"], ["ACTIVE", "Aktiv"], ["PAUSED", "Pausiert"]].map(([v, l]) => <Link key={v} href={v ? `/admin/haendler?status=${v}` : "/admin/haendler"} className="chip !min-h-[40px]" aria-current={(status ?? "") === v ? "true" : undefined}>{l}</Link>)}
      </div>
      <div className="card table-wrap"><table className="table">
        <thead><tr><th>Name</th><th>Kontakt</th><th>Stand</th><th>Unser Anteil</th><th>Freigabe</th><th>Produkte</th><th>Verkäufe</th></tr></thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.id}>
              <td><Link href={`/admin/haendler/${v.id}`} className="font-semibold text-accent-text">{v.name}</Link><span className="block text-xs text-ink-2">{v.city ? `${v.city} · ` : ""}seit {v.createdAt.toLocaleDateString("de-DE")}</span></td>
              <td>{v.users[0]?.name ?? v.payoutHolder}<span className="block text-xs text-ink-2">{v.email}</span></td>
              <td><StatusBadge status={v.status} kind="vendor" /></td>
              <td className="num">{v.commissionPercent} %</td>
              <td>{v.autoApprove ? "stellt selbst ein" : "durch uns"}</td>
              <td>{v._count.products}</td>
              <td>{v._count.orderItems}</td>
            </tr>
          ))}
          {vendors.length === 0 ? <tr><td colSpan={7} className="text-ink-2">Keine Macher in dieser Ansicht.</td></tr> : null}
        </tbody>
      </table></div>
    </div>
  );
}
