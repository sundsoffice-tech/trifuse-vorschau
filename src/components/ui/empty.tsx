export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-semibold text-lg">{title}</p>
      {text ? <p className="text-ink-2 mt-2 max-w-md mx-auto">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
