import Link from "next/link";

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Seiten" className="flex items-center justify-center gap-2 mt-8">
      {page > 1 ? <Link className="btn btn-secondary btn-sm" href={makeHref(page - 1)}>Zurück</Link> : null}
      <span className="text-sm text-ink-2 px-2">Seite {page} von {pages}</span>
      {page < pages ? <Link className="btn btn-secondary btn-sm" href={makeHref(page + 1)}>Weiter</Link> : null}
    </nav>
  );
}
