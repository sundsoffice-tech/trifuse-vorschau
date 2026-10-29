import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { listCategories } from "@/modules/catalog/queries";
import { saveVendorProductAction, uploadVendorImagesAction, deleteVendorImageAction, firstVendorImageAction, setVendorProductStatusAction } from "@/modules/catalog/vendor-actions";
import { ProductForm } from "@/components/forms/product-form";
import { ProductImages } from "@/components/forms/product-images";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";

export default async function EditVendorProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gespeichert?: string; bildfehler?: string }> }) {
  const user = await requireVendorUser();
  const { id } = await params;
  const sp = await searchParams;
  const [vendor, product, categories] = await Promise.all([
    db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } }),
    db.product.findFirst({ where: { id, vendorId: user.vendorId }, include: { images: { orderBy: { sortOrder: "asc" } } } }),
    listCategories(),
  ]);
  if (!product) notFound();
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/portal/produkte" className="text-sm text-ink-3">← Produkte</Link>
          <h1 className="font-display text-3xl font-semibold mt-1">{product.title}</h1>
          <div className="mt-2 flex items-center gap-2"><StatusBadge status={product.status} />{product.status === "ACTIVE" ? <Link href={`/produkt/${product.slug}`} className="text-sm text-accent" target="_blank">Im Shop ansehen</Link> : null}</div>
        </div>
        <form action={setVendorProductStatusAction} className="flex gap-2">
          <input type="hidden" name="productId" value={product.id} />
          {product.status === "ACTIVE" ? <button className="btn btn-secondary btn-sm" name="intent" value="unpublish" type="submit">Offline nehmen</button> : null}
          <button className="btn btn-ghost btn-sm text-bad" name="intent" value="archive" type="submit">Archivieren</button>
        </form>
      </div>
      {sp.gespeichert ? <Alert tone="ok">Gespeichert.</Alert> : null}
      {sp.bildfehler ? <Alert tone="warn">Produkt gespeichert, aber nicht alle Bilder: {sp.bildfehler}</Alert> : null}
      {product.status === "REJECTED" ? <Alert tone="bad">Abgelehnt{product.rejectReason ? `: ${product.rejectReason}` : "."} Überarbeite das Produkt und reiche es erneut ein.</Alert> : null}
      {product.status === "PENDING" ? <Alert tone="warn">Wartet auf Freigabe durch das Marktplatz-Team.</Alert> : null}

      <section className="card p-5 md:p-6 space-y-4">
        <h2 className="font-semibold text-lg">Bilder</h2>
        <ProductImages images={product.images} productId={product.id} deleteAction={deleteVendorImageAction} firstAction={firstVendorImageAction} />
        <form action={uploadVendorImagesAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="productId" value={product.id} />
          <input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="text-sm" required />
          <button className="btn btn-secondary btn-sm" type="submit">Hochladen</button>
        </form>
      </section>

      <ProductForm action={saveVendorProductAction} categories={categories} product={product} mode="vendor" canPublishDirectly={vendor.autoApprove} />
    </div>
  );
}
