import type { ProductStatus, OrderStatus, VendorStatus, FulfillmentStatus, PayoutStatus } from "@prisma/client";

const labels: Record<string, { text: string; cls: string }> = {
  DRAFT: { text: "Entwurf", cls: "badge-muted" },
  PENDING: { text: "Wartet auf Freigabe", cls: "badge-warn" },
  ACTIVE: { text: "Live", cls: "badge-ok" },
  REJECTED: { text: "Abgelehnt", cls: "badge-bad" },
  ARCHIVED: { text: "Archiviert", cls: "badge-muted" },
  PAUSED: { text: "Pausiert", cls: "badge-bad" },
  PAID: { text: "Bezahlt", cls: "badge-ok" },
  CANCELLED: { text: "Storniert", cls: "badge-muted" },
  REFUNDED: { text: "Erstattet", cls: "badge-bad" },
  NEW: { text: "Neu", cls: "badge-accent" },
  PACKED: { text: "Gepackt", cls: "badge-warn" },
  SHIPPED: { text: "Versendet", cls: "badge-ok" },
  DELIVERED: { text: "Zugestellt", cls: "badge-ok" },
  RETURNED: { text: "Retoure", cls: "badge-bad" },
};

const orderPending = { text: "Zahlung offen", cls: "badge-warn" };
const vendorPending = { text: "Bewerbung offen", cls: "badge-warn" };
const payoutDraft = { text: "Entwurf", cls: "badge-warn" };

export function StatusBadge({ status, kind }: { status: ProductStatus | OrderStatus | VendorStatus | FulfillmentStatus | PayoutStatus; kind?: "order" | "vendor" | "payout" }) {
  let entry = labels[status] ?? { text: status, cls: "badge-muted" };
  if (kind === "order" && status === "PENDING") entry = orderPending;
  if (kind === "vendor" && status === "PENDING") entry = vendorPending;
  if (kind === "payout" && status === "DRAFT") entry = payoutDraft;
  return <span className={`badge ${entry.cls}`}>{entry.text}</span>;
}
