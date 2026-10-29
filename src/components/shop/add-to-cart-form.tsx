"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addToCartAction } from "@/modules/cart/actions";
import { SubmitButton } from "@/components/ui/submit-button";

export function AddToCartForm({ productId, max }: { productId: string; max: number }) {
  const [state, action] = useActionState(addToCartAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="productId" value={productId} />
      <label className="sr-only" htmlFor="quantity">Menge</label>
      <select id="quantity" name="quantity" defaultValue="1" className="select !w-24">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <SubmitButton pendingText="Wird hinzugefügt …">In den Warenkorb</SubmitButton>
      {state?.ok ? <span className="text-sm text-ok">{state.message} <Link href="/warenkorb" className="underline">Zum Warenkorb</Link></span> : null}
      {state && !state.ok ? <span className="text-sm text-bad" role="alert">{state.message}</span> : null}
    </form>
  );
}
