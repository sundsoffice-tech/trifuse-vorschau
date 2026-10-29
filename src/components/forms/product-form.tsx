"use client";

import { useActionState } from "react";
import type { Category, Product, ShippingBy } from "@prisma/client";
import type { ActionState } from "@/lib/form";
import { centsToEuroInput } from "@/lib/money";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

type VendorOption = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  product,
  mode,
  vendors,
  canPublishDirectly,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  product?: Product | null;
  mode: "vendor" | "admin";
  vendors?: VendorOption[];
  canPublishDirectly: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const err = state?.fieldErrors ?? {};
  const shippingDefault: ShippingBy = product?.shippingBy ?? "WAREHOUSE";
  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data" noValidate>
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="card p-5 md:p-6 space-y-5">
        <h2 className="font-semibold text-lg">Produkt</h2>
        {mode === "admin" && vendors ? (
          <Field label="Händler" name="vendorId" error={err.vendorId}>
            <select id="vendorId" name="vendorId" className="select" defaultValue={product?.vendorId ?? ""} required>
              <option value="">Bitte wählen</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="Titel" name="title" error={err.title}>
          <input id="title" name="title" className="input" defaultValue={product?.title ?? ""} maxLength={140} required />
        </Field>
        <Field label="Beschreibung" name="description" hint="Material, Größe, Besonderheiten. Absätze bleiben erhalten.">
          <textarea id="description" name="description" className="textarea !min-h-[160px]" defaultValue={product?.description ?? ""} maxLength={5000} />
        </Field>
        <Field label="Kategorie" name="categoryId">
          <select id="categoryId" name="categoryId" className="select" defaultValue={product?.categoryId ?? ""}>
            <option value="">Keine Kategorie</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="card p-5 md:p-6 space-y-5">
        <h2 className="font-semibold text-lg">Preis und Bestand</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Verkaufspreis in Euro" name="price" error={err.price} hint="Brutto, z. B. 24,90">
            <input id="price" name="price" inputMode="decimal" className="input" defaultValue={centsToEuroInput(product?.priceCents)} required />
          </Field>
          <Field label="Streichpreis (optional)" name="compareAt" error={err.compareAt}>
            <input id="compareAt" name="compareAt" inputMode="decimal" className="input" defaultValue={centsToEuroInput(product?.compareAtCents)} />
          </Field>
          <Field label="Bestand (Stück)" name="stock" error={err.stock}>
            <input id="stock" name="stock" type="number" min={0} className="input" defaultValue={product?.stock ?? 1} required />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Artikelnummer (optional)" name="sku"><input id="sku" name="sku" className="input" defaultValue={product?.sku ?? ""} maxLength={60} /></Field>
          <Field label="Gewicht in Gramm (optional)" name="weightGrams"><input id="weightGrams" name="weightGrams" type="number" min={0} className="input" defaultValue={product?.weightGrams ?? ""} /></Field>
          <Field label="Versand durch" name="shippingBy">
            <select id="shippingBy" name="shippingBy" className="select" defaultValue={shippingDefault}>
              <option value="WAREHOUSE">Marktplatz-Lager</option>
              <option value="VENDOR">Händler selbst</option>
            </select>
          </Field>
        </div>
      </div>

      {!product ? (
        <div className="card p-5 md:p-6 space-y-3">
          <h2 className="font-semibold text-lg">Bilder</h2>
          <input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="block w-full text-sm file:btn file:btn-secondary file:btn-sm file:mr-3" />
          <p className="hint">JPG, PNG oder WebP, je bis 5 MB, höchstens 8 Bilder. Das erste Bild ist das Hauptbild. Weitere Bilder kannst du nach dem Speichern verwalten.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton className="btn btn-secondary" name="intent" value="draft" pendingText="Speichert …">Als Entwurf speichern</SubmitButton>
        <SubmitButton className="btn btn-primary" name="intent" value="publish" pendingText="Speichert …">
          {canPublishDirectly ? "Speichern und veröffentlichen" : "Speichern und zur Freigabe einreichen"}
        </SubmitButton>
      </div>
    </form>
  );
}
