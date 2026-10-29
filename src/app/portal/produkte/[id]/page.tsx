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
          <Link href="/portal/produkte" className="text-sm text-ink-2 hover:underline">← Produkte</Link>
          <h1 className="font-display text-3xl font-semibold mt-1">{product.title}</h1>
          <div className="mt-2 flex items-center gap-2"><StatusBadge status={product.status} />{product.status === "ACTIVE" ? <Link href={`/produkt/${product.slug}`} className="text-sm text-accent-text font-semibold" target="_blank">Im Shop ansehen</Link> : null}</div>
        </div>
        <form action={setVendorProductStatusAction} className="flex gap-2">
          <input type="hidden" name="productId" value={product.id} />
          {product.status === "ACTIVE" ? <button className="btn btn-secondary btn-sm" name="intent" value="unpublish" type="submit">Aus dem Shop nehmen</button> : null}
          <button className="btn btn-ghost btn-sm text-bad" name="intent" value="archive" type="submit">Archivieren</button>
        </form>
      </div>
      {sp.gespeichert ? <Alert tone="ok">Gespeichert.</Alert> : null}
      {sp.bildfehler ? <Alert tone="warn">Produkt gespeichert, aber nicht alle Fotos: {sp.bildfehler}</Alert> : null}
      {product.status === "REJECTED" ? <Alert tone="bad">Abgelehnt{product.rejectReason ? `: ${product.rejectReason}` : "."} Überarbeite das Produkt und schick es noch einmal.</Alert> : null}
      {product.status === "PENDING" ? <Alert tone="warn">Wartet auf Freigabe. Wir melden uns, meist innerhalb von zwei Werktagen.</Alert> : null}
      <ProductImages images={product.images} productId={product.id} deleteAction={deleteVendorImageAction} firstAction={firstVendorImageAction} uploadAction={uploadVendorImagesAction} />
      <ProductForm action={saveVendorProductAction} categories={categories} product={product} mode="vendor" canPublishDirectly={vendor.autoApprove} commissionPercent={vendor.commissionPercent} />
    </div>
  );
}
