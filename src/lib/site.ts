/** Suchmaschinen erst nach Freigabe: SITE_INDEXABLE=true in der .env des Servers (Hausregel noindex bis dahin). */
export function siteIndexable(): boolean {
  return process.env.SITE_INDEXABLE === "true";
}
