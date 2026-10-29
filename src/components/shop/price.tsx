import { formatCents } from "@/lib/money";

export function Price({ cents, compareAt, className = "" }: { cents: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-semibold">{formatCents(cents)}</span>
      {compareAt && compareAt > cents ? <s className="text-ink-3 text-sm">{formatCents(compareAt)}</s> : null}
    </span>
  );
}
