"use client";

import { useRef, useState } from "react";

/** Deutscher Dateiknopf mit Vorschau statt „Choose Files / No file chosen“ (Künstler-Fund 25). */
export function ImagePicker({ name = "images", multiple = true, label = "Fotos auswählen", hint }: { name?: string; multiple?: boolean; label?: string; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  return (
    <div>
      <input
        ref={ref}
        id={name}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          setPreviews(files.map((f) => ({ url: URL.createObjectURL(f), name: f.name })));
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-secondary" onClick={() => ref.current?.click()}>{label}</button>
        <span className="text-sm text-ink-2">{previews.length === 0 ? "Noch nichts ausgewählt" : `${previews.length} ${previews.length === 1 ? "Foto" : "Fotos"} ausgewählt`}</span>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
      {previews.length ? (
        <ul className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
          {previews.map((p) => (
            <li key={p.url} className="aspect-square rounded-md border border-line overflow-hidden bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
