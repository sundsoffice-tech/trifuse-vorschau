export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
      <p className="font-display text-2xl font-semibold mt-1">{value}</p>
      {hint ? <p className="text-xs text-ink-2 mt-1">{hint}</p> : null}
    </div>
  );
}
