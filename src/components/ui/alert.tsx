export function Alert({ tone = "info", children }: { tone?: "info" | "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = {
    info: "bg-surface-2 text-ink-2 border-line",
    ok: "bg-ok-soft text-ok border-ok/20",
    warn: "bg-warn-soft text-warn border-warn/20",
    bad: "bg-bad-soft text-bad border-bad/20",
  }[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
