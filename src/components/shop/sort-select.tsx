"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Sortierung wirkt sofort beim Wechsel; kein eigener Knopf (Künstler-Fund 11). */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      Sortieren
      <select
        className="select !w-auto !min-h-[40px]"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          if (e.target.value === "neu") next.delete("sortierung"); else next.set("sortierung", e.target.value);
          next.delete("seite");
          router.push(`/produkte${next.toString() ? `?${next}` : ""}`);
        }}
      >
        <option value="neu">Neueste zuerst</option>
        <option value="preis-auf">Preis aufsteigend</option>
        <option value="preis-ab">Preis absteigend</option>
      </select>
    </label>
  );
}
