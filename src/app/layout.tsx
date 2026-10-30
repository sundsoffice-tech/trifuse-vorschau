import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { siteIndexable } from "@/lib/site";

// Selbst gehostet über next/font (Hausregel: kein Systemfont als Display, Schrift selbst hosten).
const sans = Source_Sans_3({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "600", "700"] });
const serif = Source_Serif_4({ variable: "--font-display", subsets: ["latin"], weight: "variable", axes: ["opsz"] });

// Hausregel: Seiten tragen noindex, bis Fabrice sie freigibt. SITE_INDEXABLE=true schaltet Suchmaschinen frei.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.claim,
  robots: siteIndexable() ? { index: true, follow: true } : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
