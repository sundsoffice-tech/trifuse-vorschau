import { formatCents } from "@/lib/money";
import { formatBasePrice, type BasePrice } from "@/lib/grundpreis";

export function Price({ cents, compareAt, basePrice: bp, className = "" }: { cents: number; compareAt?: number | null; basePrice?: BasePrice | null; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 num ${className}`}>
      <span className="font-semibold">{formatCents(cents)}</span>
      {compareAt && compareAt > cents ? <s className="text-ink-3 text-sm">{formatCents(compareAt)}</s> : null}
      {bp ? <span className="text-ink-2 text-sm font-normal">({formatBasePrice(bp)})</span> : null}
    </span>
  );
}

/** Die eine Zeile, die das Versprechen einlöst: was vom Preis beim Macher ankommt. */
export function MakerShare({ shareCents, makerName, className = "" }: { shareCents: number; makerName: string; className?: string }) {
  return (
    <span className={`num text-accent-text font-semibold ${className}`}>{formatCents(shareCents)} <span className="hidden sm:inline">gehen </span>an {makerName}</span>
  );
}
