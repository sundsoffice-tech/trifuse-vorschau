import type { ProductImage } from "@prisma/client";
import { imageUrl } from "@/modules/media/url";

export function ProductImages({ images, productId, deleteAction, firstAction }: { images: ProductImage[]; productId: string; deleteAction: (fd: FormData) => Promise<void>; firstAction: (fd: FormData) => Promise<void> }) {
  if (images.length === 0) return <p className="text-sm text-ink-3">Noch keine Bilder. Ohne Bild wird das Produkt mit einem Platzhalter angezeigt.</p>;
  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {images.map((img, idx) => (
        <li key={img.id} className="card overflow-hidden">
          <div className="aspect-square bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(img.path)} alt={img.alt} className="w-full h-full object-cover" />
          </div>
          <div className="p-2 flex flex-col gap-1">
            {idx === 0 ? <span className="badge badge-accent self-start">Hauptbild</span> : (
              <form action={firstAction}><input type="hidden" name="productId" value={productId} /><input type="hidden" name="imageId" value={img.id} /><button className="btn btn-ghost btn-sm w-full" type="submit">Als Hauptbild</button></form>
            )}
            <form action={deleteAction}><input type="hidden" name="productId" value={productId} /><input type="hidden" name="imageId" value={img.id} /><button className="btn btn-ghost btn-sm w-full text-bad" type="submit">Entfernen</button></form>
          </div>
        </li>
      ))}
    </ul>
  );
}
