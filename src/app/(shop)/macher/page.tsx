import type { Metadata } from "next";
import { listActiveVendors } from "@/modules/catalog/queries";
import { MakerRow } from "@/components/shop/maker-row";

export const metadata: Metadata = { title: "Macher" };

export default async function VendorsPage() {
  const vendors = await listActiveVendors();
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl md:text-4xl font-semibold">Die Macher</h1>
      <p className="text-ink-2 mt-1 max-w-[60ch]">Kleine Hersteller, die ihre Produkte über trifuse.store verkaufen. Jeder bekommt den größten Teil des Preises.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {vendors.map((v) => <MakerRow key={v.id} vendor={v} productCount={v._count.products} />)}
        {vendors.length === 0 ? <p className="text-ink-2">Noch keine Macher freigeschaltet.</p> : null}
      </div>
    </div>
  );
}
