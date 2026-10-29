// Spiegel der reinen Funktion aus src/modules/catalog/product-service.ts (die Datei zieht "server-only" und Prisma).
export function statusAfterVendorSubmit(wantsLive, autoApprove, current) {
  if (!wantsLive) return current === "ACTIVE" ? "ACTIVE" : "DRAFT";
  return autoApprove ? "ACTIVE" : "PENDING";
}
