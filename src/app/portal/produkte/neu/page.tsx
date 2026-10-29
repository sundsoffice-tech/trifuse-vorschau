import { requireVendorUser } from "@/modules/auth/session";
import { db } from "@/lib/db";
import { listCategories } from "@/modules/catalog/queries";
import { saveVendorProductAction } from "@/modules/catalog/vendor-actions";
import { ProductForm } from "@/components/forms/product-form";
import { Alert } from "@/components/ui/alert";

export default async function NewVendorProduct() {
  const user = await requireVendorUser();
  const [vendor, categories] = await Promise.all([db.vendor.findUniqueOrThrow({ where: { id: user.vendorId } }), listCategories()]);
  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="font-display text-3xl font-semibold">Neues Produkt</h1><p className="text-ink-2">{vendor.autoApprove ? "Du kannst direkt veröffentlichen." : "Nach dem Einreichen prüft das Marktplatz-Team dein Produkt, meist innerhalb von zwei Werktagen."}</p></div>
      {vendor.status !== "ACTIVE" ? <Alert tone="warn">Dein Konto ist noch nicht freigeschaltet. Speichern ist erst danach möglich.</Alert> : null}
      <ProductForm action={saveVendorProductAction} categories={categories} mode="vendor" canPublishDirectly={vendor.autoApprove} />
    </div>
  );
}
