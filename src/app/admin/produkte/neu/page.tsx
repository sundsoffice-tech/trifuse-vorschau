import { db } from "@/lib/db";
import { listCategories } from "@/modules/catalog/queries";
import { getSettingNumber } from "@/lib/settings";
import { saveAdminProductAction } from "@/modules/catalog/admin-actions";
import { ProductForm } from "@/components/forms/product-form";

export default async function AdminNewProduct() {
  const [vendors, categories, commission] = await Promise.all([
    db.vendor.findMany({ where: { status: { not: "PAUSED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, commissionPercent: true } }),
    listCategories(),
    getSettingNumber("commission_percent"),
  ]);
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="font-display text-3xl font-semibold">Produkt anlegen</h1><p className="text-ink-2">Für einen Macher einstellen. In den Shop stellen geht sofort.</p></div>
      <ProductForm action={saveAdminProductAction} categories={categories} mode="admin" vendors={vendors} canPublishDirectly commissionPercent={commission} />
    </div>
  );
}
