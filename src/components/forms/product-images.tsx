import type { ProductImage } from "@prisma/client";
import { imageUrl } from "@/modules/media/url";
import { ImagePicker } from "./image-picker";

export function ProductImages({ images, productId, deleteAction, firstAction, uploadAction }: { images: ProductImage[]; productId: string; deleteAction: (fd: FormData) => Promise<void>; firstAction: (fd: FormData) => Promise<void>; uploadAction: (fd: FormData) => Promise<void> }) {
  return (
    <section className="card p-5 md:p-6 space-y-4">
      <h2 className="font-semibold text-lg">Fotos</h2>
      {images.length === 0 ? <p className="text-sm text-ink-2">Noch keine Fotos. Ohne Foto zeigt der Shop einen Platzhalter, und kaum jemand kauft.</p> : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {images.map((img, idx) => (
            <li key={img.id} className="card overflow-hidden">
              <div className="aspect-square bg-surface-2 img-surface">
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
      )}
      <form action={uploadAction} encType="multipart/form-data" className="space-y-3">
        <input type="hidden" name="productId" value={productId} />
        <ImagePicker label={images.length ? "Weitere Fotos auswählen" : "Fotos auswählen"} hint="JPG, PNG oder WebP, je bis 5 MB, höchstens 8 Fotos." />
        <button className="btn btn-secondary btn-sm" type="submit">Hochladen</button>
      </form>
    </section>
  );
}
