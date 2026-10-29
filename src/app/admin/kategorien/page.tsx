import { listCategoriesWithCounts } from "@/modules/catalog/queries";
import { adminCategoryAction } from "@/modules/catalog/admin-actions";

export default async function AdminCategories() {
  const categories = await listCategoriesWithCounts();
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Kategorien</h1><p className="text-ink-2">Reihenfolge über die Sortierzahl. Beim Löschen bleiben die Produkte erhalten, nur ohne Kategorie.</p></div>
      <form action={adminCategoryAction} className="card p-4 flex gap-2 items-end">
        <input type="hidden" name="intent" value="create" />
        <div className="flex-1"><label className="label" htmlFor="name">Neue Kategorie</label><input id="name" name="name" className="input" required /></div>
        <button className="btn btn-primary" type="submit">Anlegen</button>
      </form>
      <ul className="card divide-y divide-line">
        {categories.map((c) => (
          <li key={c.id} className="p-3">
            <form action={adminCategoryAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input name="sortOrder" type="number" defaultValue={c.sortOrder} className="input !w-20 !min-h-[36px]" aria-label="Sortierung" />
              <input name="name" defaultValue={c.name} className="input flex-1 !min-h-[36px]" aria-label="Name" />
              <span className="text-xs text-ink-3 w-24">{c._count.products} live</span>
              <button className="btn btn-secondary btn-sm" name="intent" value="rename" type="submit">Speichern</button>
              <button className="btn btn-ghost btn-sm text-bad" name="intent" value="delete" type="submit">Löschen</button>
            </form>
          </li>
        ))}
        {categories.length === 0 ? <li className="p-4 text-sm text-ink-2">Noch keine Kategorien.</li> : null}
      </ul>
    </div>
  );
}
