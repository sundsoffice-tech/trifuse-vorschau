import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface-2">
      <div className="container-x py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="font-display text-xl font-semibold">trifuse<span className="text-accent-text">.store</span></p>
          <p className="text-ink-2 mt-2 max-w-xs">{BRAND.claim} Jedes Produkt zeigt, was beim Macher ankommt.</p>
          <p className="text-ink-2 mt-3">Fragen? <a href={`mailto:${BRAND.supportEmail}`} className="underline">{BRAND.supportEmail}</a></p>
        </div>
        <div>
          <p className="font-semibold mb-2">Einkaufen</p>
          <ul className="space-y-1 text-ink-2">
            <li><Link href="/produkte">Alle Produkte</Link></li>
            <li><Link href="/macher">Alle Macher</Link></li>
            <li><Link href="/verkaufen">Selbst verkaufen</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold mb-2">Rechtliches</p>
          <ul className="space-y-1 text-ink-2">
            <li><Link href="/impressum">Impressum</Link></li>
            <li><Link href="/datenschutz">Datenschutz</Link></li>
            <li><Link href="/agb">AGB</Link></li>
            <li><Link href="/widerruf">Widerrufsbelehrung</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
