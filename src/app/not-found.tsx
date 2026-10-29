import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-20 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-3">404</p>
      <h1 className="font-display text-3xl font-semibold mt-2">Diese Seite gibt es nicht.</h1>
      <Link href="/" className="btn btn-primary mt-6">Zur Startseite</Link>
    </div>
  );
}
