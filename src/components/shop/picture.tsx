import { imageSrc, imageSrcSet, type IMAGE_WIDTHS } from "@/modules/media/url";

/**
 * Ein Bild aus dem Speicher mit allen Größen; der Browser lädt die passende. `sizes` sagt ihm, wie breit
 * das Bild im Layout ist (z. B. "(min-width: 1024px) 25vw, 50vw" für eine Karte im Raster).
 */
export function Picture({ path, alt, sizes, width = 640, className = "", loading = "lazy", fetchPriority }: {
  path: string | null | undefined;
  alt: string;
  sizes: string;
  width?: (typeof IMAGE_WIDTHS)[number];
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageSrc(path, width)} srcSet={imageSrcSet(path)} sizes={sizes} alt={alt} loading={loading} fetchPriority={fetchPriority} decoding="async" className={className} />;
}
