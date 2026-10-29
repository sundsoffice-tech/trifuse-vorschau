import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listCategories } from "@/modules/catalog/queries";
import { saveAdminProductAction, adminProductStatusAction, adminUploadImagesAction, adminDeleteImageAction, adminFirstImageAction } from "@/modules/catalog/admin-actions";
import { ProductForm } from "@/components/forms/product-form";
import { ProductImages } from "@/components/forms/product-images";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";

export default async function AdminEditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gespeichert?: string; bildfehler?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [product, vendors, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, vendor: true } }),
    db.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, commissionPercent: true } }),
    listCategories(),
  ]);
  if (!product) notFound();
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/produkte" className="text-sm text-ink-2 hover:underline">← Produkte</Link>
        <h1 className="font-display text-3xl font-semibold mt-1">{product.title}</h1>
        <p className="text-ink-2 text-sm mt-1">Macher: <Link href={`/admin/haendler/${product.vendorId}`} className="text-accent-text font-semibold">{product.vendor.name}</Link></p>
        <div className="mt-2 flex items-center gap-2"><StatusBadge status={product.status} />{product.stock <= 0 ? <span className="badge badge-accent">Ausverkauft</span> : null}{product.status === "ACTIVE" ? <Link href={`/produkt/${product.slug}`} className="text-sm text-accent-text font-semibold" target="_blank">Im Shop ansehen</Link> : null}</div>
      </div>
      {sp.gespeichert ? <Alert tone="ok">Gespeichert.</Alert> : null}
      {sp.bildfehler ? <Alert tone="warn">Produkt gespeichert, aber nicht alle Fotos: {sp.bildfehler}</Alert> : null}

      <section id="pruefen" className="card p-5 md:p-6 space-y-3">
        <h2 className="font-semibold text-lg">Freigabe</h2>
        <form action={adminProductStatusAction} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="productId" value={product.id} />
          {product.status !== "ACTIVE" && product.status !== "ARCHIVED" ? <button className="btn btn-primary btn-sm" name="intent" value="approve" type="submit">Freigeben und in den Shop stellen</button> : null}
          {product.status === "ACTIVE" ? <button className="btn btn-secondary btn-sm" name="intent" value="unpublish" type="submit">Aus dem Shop nehmen</button> : null}
          {product.status === "ARCHIVED" ? <button className="btn btn-secondary btn-sm" name="intent" value="restore" type="submit">Wiederherstellen</button> : <button className="btn btn-ghost btn-sm" name="intent" value="archive" type="submit">Archivieren</button>}
          {product.status === "PENDING" || product.status === "ACTIVE" ? (
            <div className="flex items-end gap-2 w-full sm:w-auto">
              <div className="flex-1"><label className="label" htmlFor="reason">Grund für die Ablehnung, der Macher liest ihn</label><input id="reason" name="reason" className="input !min-h-[36px]" placeholder="z. B. Fotos zu dunkel, Beschreibung fehlt" /></div>
              <button className="btn btn-danger btn-sm" name="intent" value="reject" type="submit">Ablehnen</button>
            </div>
          ) : null}
        </form>
        {product.rejectReason ? <p className="text-sm text-bad">Letzter Grund: {product.rejectReason}</p> : null}
      </section>

      <ProductImages images={product.images} productId={product.id} deleteAction={adminDeleteImageAction} firstAction={adminFirstImageAction} uploadAction={adminUploadImagesAction} />
      <ProductForm action={saveAdminProductAction} categories={categories} product={product} mode="admin" vendors={vendors} canPublishDirectly commissionPercent={product.vendor.commissionPercent} />
    </div>
  );
}
