export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      {children}
      {hint && !error ? <p className="hint">{hint}</p> : null}
      {error ? <p className="error" id={`${name}-error`}>{error}</p> : null}
    </div>
  );
}
