import { db } from "@/lib/db";
import { listCategories } from "@/modules/catalog/queries";
import { saveAdminProductAction } from "@/modules/catalog/admin-actions";
import { ProductForm } from "@/components/forms/product-form";

export default async function AdminNewProduct() {
  const [vendors, categories] = await Promise.all([db.vendor.findMany({ where: { status: { not: "PAUSED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }), listCategories()]);
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="font-display text-3xl font-semibold">Produkt anlegen</h1><p className="text-ink-2">Für einen Händler einpflegen. Veröffentlichen geht sofort.</p></div>
      <ProductForm action={saveAdminProductAction} categories={categories} mode="admin" vendors={vendors} canPublishDirectly />
    </div>
  );
}
