"use client";

import { useActionState, useState } from "react";
import type { Category, Product, ShippingBy } from "@prisma/client";
import type { ActionState } from "@/lib/form";
import { centsToEuroInput, parseEuroToCents, formatCents } from "@/lib/money";
import { splitLine } from "@/lib/money";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { ImagePicker } from "./image-picker";
import { CONTENT_UNITS, basePrice, formatBasePrice, parseAmount } from "@/lib/grundpreis";

type VendorOption = { id: string; name: string; commissionPercent: number };

export function ProductForm({
  action,
  categories,
  product,
  mode,
  vendors,
  canPublishDirectly,
  commissionPercent,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  product?: Product | null;
  mode: "vendor" | "admin";
  vendors?: VendorOption[];
  canPublishDirectly: boolean;
  /** Provisionssatz für die Zeile „Du bekommst …“; im Admin aus der Händlerwahl. */
  commissionPercent: number;
}) {
  const [state, formAction] = useActionState(action, null);
  const [price, setPrice] = useState(centsToEuroInput(product?.priceCents));
  const [vendorId, setVendorId] = useState(product?.vendorId ?? "");
  const err = state?.fieldErrors ?? {};
  const shippingDefault: ShippingBy = product?.shippingBy ?? "WAREHOUSE";
  const pct = mode === "admin" ? (vendors?.find((v) => v.id === vendorId)?.commissionPercent ?? commissionPercent) : commissionPercent;
  const cents = parseEuroToCents(price);
  const share = cents != null && cents > 0 ? splitLine(cents, pct).vendorNetCents : null;
  const [amount, setAmount] = useState(product?.contentAmount ? String(product.contentAmount).replace(".", ",") : "");
  const [unit, setUnit] = useState(product?.contentUnit ?? "");
  const grundpreis = cents != null && cents > 0 ? basePrice(cents, parseAmount(amount), unit) : null;

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data" noValidate>
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {state && !state.ok && state.message ? <Alert tone="bad">{state.message}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      {!product ? (
        <div className="card p-5 md:p-6 space-y-3">
          <h2 className="font-semibold text-lg">Fotos</h2>
          <p className="text-sm text-ink-2">Das erste Foto ist das Hauptbild. JPG, PNG oder WebP, je bis 5 MB, höchstens 8 Fotos. Nach dem Speichern kannst du die Reihenfolge ändern.</p>
          <ImagePicker />
        </div>
      ) : null}

      <div className="card p-5 md:p-6 space-y-5">
        <h2 className="font-semibold text-lg">Produkt</h2>
        {mode === "admin" && vendors ? (
          <Field label="Macher" name="vendorId" error={err.vendorId}>
            <select id="vendorId" name="vendorId" className="select" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
              <option value="">Bitte wählen</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="Name des Produkts" name="title" error={err.title}>
          <input id="title" name="title" className="input" defaultValue={product?.title ?? ""} maxLength={140} required />
        </Field>
        <Field label="Beschreibung" name="description" hint="Material, Größe, Besonderheiten, wie es entsteht. Absätze bleiben erhalten.">
          <textarea id="description" name="description" className="textarea !min-h-[160px]" defaultValue={product?.description ?? ""} maxLength={5000} />
        </Field>
        <Field label="Art" name="categoryId" error={err.categoryId} hint="Danach stöbern Kunden. Ohne Art findet dein Produkt kaum jemand.">
          <select id="categoryId" name="categoryId" className="select" defaultValue={product?.categoryId ?? ""} required>
            <option value="">Bitte wählen</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="card p-5 md:p-6 space-y-5">
        <h2 className="font-semibold text-lg">Preis und Bestand</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Verkaufspreis in Euro" name="price" error={err.price} hint="Mit Mehrwertsteuer, z. B. 24,90">
            <input id="price" name="price" inputMode="decimal" className="input num" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </Field>
          <Field label="Streichpreis (optional)" name="compareAt" error={err.compareAt}>
            <input id="compareAt" name="compareAt" inputMode="decimal" className="input num" defaultValue={centsToEuroInput(product?.compareAtCents)} />
          </Field>
          <Field label="Bestand (Stück)" name="stock" error={err.stock}>
            <input id="stock" name="stock" type="number" min={0} className="input num" defaultValue={product?.stock ?? 1} required />
          </Field>
        </div>
        <p className="text-sm num" aria-live="polite">
          {share != null ? <>Davon {mode === "vendor" ? "bekommst du" : "bekommt der Macher"} <strong className="text-accent-text">{formatCents(share)}</strong> je Stück ({Math.round(100 - pct)} %). Der Rest deckt Verpackung, Versand, Zahlung und Kundendienst.</> : <span className="text-ink-2">Trag einen Preis ein, dann siehst du hier den Anteil {mode === "vendor" ? "für dich" : "des Machers"}.</span>}
        </p>
        <div className="grid sm:grid-cols-[1fr_1fr] gap-4">
          <Field label="Inhalt (Menge)" name="contentAmount" error={err.contentAmount} hint="Pflicht bei allem, was nach Gewicht, Volumen oder Länge verkauft wird: Lebensmittel, Seife, Kerzenwachs, Stoff. Bei Sets die Stückzahl.">
            <input id="contentAmount" name="contentAmount" inputMode="decimal" className="input num" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 500" />
          </Field>
          <Field label="Einheit" name="contentUnit" error={err.contentUnit}>
            <select id="contentUnit" name="contentUnit" className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">keine Angabe</option>
              {CONTENT_UNITS.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
            </select>
          </Field>
        </div>
        {grundpreis ? <p className="text-sm text-ink-2 num" aria-live="polite">Grundpreis, steht neben dem Preis: <strong className="text-ink">{formatBasePrice(grundpreis)}</strong></p> : null}
        <Field label="Versand" name="shippingBy">
          <select id="shippingBy" name="shippingBy" className="select" defaultValue={shippingDefault}>
            <option value="WAREHOUSE">Über unser Lager: wir verpacken und verschicken, du lieferst uns die Ware</option>
            <option value="VENDOR">Du verschickst selbst, wir sagen dir Bescheid, wenn etwas verkauft ist</option>
          </select>
        </Field>
        <details className="group">
          <summary className="details-summary">Weitere Angaben anzeigen (Artikelnummer, Gewicht)</summary>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <Field label="Deine Artikelnummer" name="sku" hint="Falls du eine hast, erleichtert sie das Packen."><input id="sku" name="sku" className="input" defaultValue={product?.sku ?? ""} maxLength={60} /></Field>
            <Field label="Gewicht in Gramm" name="weightGrams" hint="Hilft uns beim Versand."><input id="weightGrams" name="weightGrams" type="number" min={0} className="input num" defaultValue={product?.weightGrams ?? ""} /></Field>
          </div>
        </details>
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton className="btn btn-secondary" name="intent" value="draft" pendingText="Speichert …">Als Entwurf speichern</SubmitButton>
        <SubmitButton className="btn btn-primary" name="intent" value="publish" pendingText="Speichert …">
          {canPublishDirectly ? "Speichern und in den Shop stellen" : "Speichern und zur Freigabe schicken"}
        </SubmitButton>
      </div>
    </form>
  );
}
