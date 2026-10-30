import Link from "next/link";
import { ImportForm } from "@/components/forms/import-form";
import { IMPORT_EXAMPLE } from "@/modules/catalog/import-service";

export default function AdminImportPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link href="/admin/produkte" className="text-sm text-ink-2 hover:underline">← Produkte</Link>
        <h1 className="font-display text-3xl font-semibold mt-1">Produkte aus CSV anlegen</h1>
        <p className="text-ink-2">Für viele Produkte auf einmal, zum Beispiel aus der Liste eines Machers. Erst prüfen, dann anlegen; Fotos kommen danach je Produkt dazu.</p>
      </div>
      <ImportForm example={IMPORT_EXAMPLE} />
    </div>
  );
}
