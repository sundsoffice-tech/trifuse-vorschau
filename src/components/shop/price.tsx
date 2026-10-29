import { formatCents } from "@/lib/money";

export function Price({ cents, compareAt, className = "" }: { cents: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 num ${className}`}>
      <span className="font-semibold">{formatCents(cents)}</span>
      {compareAt && compareAt > cents ? <s className="text-ink-3 text-sm">{formatCents(compareAt)}</s> : null}
    </span>
  );
}

/** Die eine Zeile, die das Versprechen einlöst: was vom Preis beim Macher ankommt. */
export function MakerShare({ shareCents, makerName, className = "" }: { shareCents: number; makerName: string; className?: string }) {
  return (
    <span className={`num text-accent-text font-semibold ${className}`}>{formatCents(shareCents)} gehen an {makerName}</span>
  );
}
