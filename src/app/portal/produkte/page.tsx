import Link from "next/link";
import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { imageUrl } from "@/modules/media/url";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { Empty } from "@/components/ui/empty";

export default async function PortalProducts() {
  const user = await requireVendorUser();
  const products = await db.product.findMany({
    where: { vendorId: user.vendorId, status: { not: "ARCHIVED" } },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, category: true },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl font-semibold">Produkte</h1><p className="text-ink-2">{products.length} Produkte</p></div>
        <Link href="/portal/produkte/neu" className="btn btn-primary">Neues Produkt</Link>
      </div>
      {products.length === 0 ? (
        <Empty title="Noch keine Produkte" text="Lege dein erstes Produkt an. Nach der Freigabe erscheint es im Shop." action={<Link href="/portal/produkte/neu" className="btn btn-primary">Produkt anlegen</Link>} />
      ) : (
        <ul className="card divide-y divide-line">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/portal/produkte/${p.id}`} className="flex items-center gap-4 p-3 hover:bg-surface-2">
                <div className="w-14 h-14 rounded-lg bg-surface-2 overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(p.images[0]?.path)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.title}</p>
                  <p className="text-xs text-ink-3">{p.category?.name ?? "Ohne Kategorie"} · Bestand {p.stock}</p>
                  {p.status === "REJECTED" && p.rejectReason ? <p className="text-xs text-bad mt-1">Grund: {p.rejectReason}</p> : null}
                </div>
                <span className="text-sm">{formatCents(p.priceCents)}</span>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
