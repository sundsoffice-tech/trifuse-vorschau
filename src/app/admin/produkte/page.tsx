import Link from "next/link";
import { db } from "@/lib/db";
import { imageUrl } from "@/modules/media/url";
import { formatCents } from "@/lib/money";
import { adminProductStatusAction } from "@/modules/catalog/admin-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProductStatus } from "@prisma/client";

const tabs: { value: ProductStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Zur Freigabe" }, { value: "ACTIVE", label: "Live" }, { value: "DRAFT", label: "Entwürfe" }, { value: "REJECTED", label: "Abgelehnt" }, { value: "ARCHIVED", label: "Archiv" }, { value: "ALL", label: "Alle" },
];

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = (tabs.find((t) => t.value === sp.status)?.value ?? "ALL") as ProductStatus | "ALL";
  const products = await db.product.findMany({
    where: { ...(status === "ALL" ? {} : { status }), ...(sp.q ? { OR: [{ title: { contains: sp.q } }, { vendor: { name: { contains: sp.q } } }, { sku: { contains: sp.q } }] } : {}) },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, vendor: { select: { name: true } }, category: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
  const counts = await db.product.groupBy({ by: ["status"], _count: { _all: true } });
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Produkte</h1>
        <Link href="/admin/produkte/neu" className="btn btn-primary">Produkt anlegen</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => <Link key={t.value} href={`/admin/produkte?status=${t.value}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={`badge !py-1.5 !px-3 ${status === t.value ? "badge-accent" : "badge-muted"}`}>{t.label}{t.value !== "ALL" ? <span className="opacity-60 ml-1">{count(t.value)}</span> : null}</Link>)}
        <form className="ml-auto flex gap-2" action="/admin/produkte"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.q ?? ""} placeholder="Titel, Händler, SKU" className="input !min-h-[36px] !py-1 w-56" /><button className="btn btn-secondary btn-sm">Suchen</button></form>
      </div>
      <ul className="card divide-y divide-line">
        {products.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-4 p-3">
            <Link href={`/admin/produkte/${p.id}`} className="w-14 h-14 rounded-lg bg-surface-2 overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(p.images[0]?.path)} alt="" className="w-full h-full object-cover" />
            </Link>
            <div className="flex-1 min-w-[200px]">
              <Link href={`/admin/produkte/${p.id}`} className="font-semibold">{p.title}</Link>
              <p className="text-xs text-ink-3">{p.vendor.name} · {p.category?.name ?? "Ohne Kategorie"} · Bestand {p.stock} · {formatCents(p.priceCents)}</p>
            </div>
            <StatusBadge status={p.status} />
            {p.status === "PENDING" ? (
              <form action={adminProductStatusAction} className="flex gap-2">
                <input type="hidden" name="productId" value={p.id} />
                <button className="btn btn-primary btn-sm" name="intent" value="approve" type="submit">Freigeben</button>
                <Link href={`/admin/produkte/${p.id}#prüfen`} className="btn btn-secondary btn-sm">Prüfen</Link>
              </form>
            ) : null}
          </li>
        ))}
        {products.length === 0 ? <li className="p-6 text-sm text-ink-2">Keine Produkte in dieser Ansicht.</li> : null}
      </ul>
    </div>
  );
}
