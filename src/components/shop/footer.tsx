import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-x py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <p className="font-display text-xl font-semibold">{BRAND.name}</p>
          <p className="text-ink-2 mt-2 max-w-xs">{BRAND.claim}</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Einkaufen</p>
          <ul className="space-y-1 text-ink-2">
            <li><Link href="/produkte">Alle Produkte</Link></li>
            <li><Link href="/haendler">Alle Marken</Link></li>
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
      <div className="container-x pb-6 text-xs text-ink-3">Betrieben von {BRAND.operator}. Versand und Kundenservice aus einer Hand.</div>
    </footer>
  );
}
