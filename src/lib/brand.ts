// Marke des Shops: trifuse.store (Domain gekauft, Fabrice 29.10.2026). Endkunden-Marke von trifuse,
// erkennbar verwandt (Marine, Orange, Taschen-Symbol), mit eigenem Auftritt für Käufer.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "trifuse.store",
  claim: "Direkt vom Macher, fair ausgezahlt.",
  supportEmail: process.env.SUPPORT_EMAIL ?? "service@trifuse.store",
  /** Antwortzeit auf Bewerbungen, steht auf der Seite „Selbst verkaufen“. */
  applyResponseDays: 3,
};
