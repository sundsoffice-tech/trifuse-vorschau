import { listCategoriesWithCounts } from "@/modules/catalog/queries";
import { adminCategoryAction } from "@/modules/catalog/admin-actions";

export default async function AdminCategories() {
  const categories = await listCategoriesWithCounts();
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Arten</h1><p className="text-ink-2">So stöbern Kunden: nach Art. Reihenfolge mit den Pfeilen. Beim Löschen bleiben die Produkte erhalten, nur ohne Zuordnung.</p></div>
      <form action={adminCategoryAction} className="card p-4 flex gap-2 items-end">
        <input type="hidden" name="intent" value="create" />
        <div className="flex-1"><label className="label" htmlFor="name">Neue Art</label><input id="name" name="name" className="input" required /></div>
        <button className="btn btn-primary" type="submit">Anlegen</button>
      </form>
      <ul className="card divide-y divide-line">
        {categories.map((c, idx) => (
          <li key={c.id} className="p-3 flex flex-wrap items-center gap-2">
            <form action={adminCategoryAction} className="flex gap-1">
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn-ghost btn-sm btn-icon" name="intent" value="up" type="submit" aria-label="Nach oben" disabled={idx === 0}>↑</button>
              <button className="btn btn-ghost btn-sm btn-icon" name="intent" value="down" type="submit" aria-label="Nach unten" disabled={idx === categories.length - 1}>↓</button>
            </form>
            <form action={adminCategoryAction} className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} className="input flex-1 !min-h-[40px]" aria-label="Name" />
              <span className="text-xs text-ink-2 w-20 num">{c._count.products} im Shop</span>
              <button className="btn btn-secondary btn-sm" name="intent" value="rename" type="submit">Umbenennen</button>
              <button className="btn btn-ghost btn-sm text-bad" name="intent" value="delete" type="submit">Löschen</button>
            </form>
          </li>
        ))}
        {categories.length === 0 ? <li className="p-4 text-sm text-ink-2">Noch keine Arten.</li> : null}
      </ul>
    </div>
  );
}
