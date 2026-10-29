import type { ProductStatus, OrderStatus, VendorStatus, FulfillmentStatus, PayoutStatus } from "@prisma/client";

const labels: Record<string, { text: string; cls: string }> = {
  DRAFT: { text: "Entwurf", cls: "badge-muted" },
  PENDING: { text: "Wartet auf Freigabe", cls: "badge-warn" },
  ACTIVE: { text: "Im Shop", cls: "badge-ok" },
  REJECTED: { text: "Abgelehnt", cls: "badge-bad" },
  ARCHIVED: { text: "Archiviert", cls: "badge-muted" },
  PAUSED: { text: "Pausiert", cls: "badge-bad" },
  PAID: { text: "Bezahlt", cls: "badge-ok" },
  CANCELLED: { text: "Storniert", cls: "badge-muted" },
  REFUNDED: { text: "Erstattet", cls: "badge-bad" },
  NEW: { text: "Noch nicht verschickt", cls: "badge-warn" },
  PACKED: { text: "Gepackt", cls: "badge-warn" },
  SHIPPED: { text: "Verschickt", cls: "badge-ok" },
  DELIVERED: { text: "Zugestellt", cls: "badge-ok" },
  RETURNED: { text: "Zurückgeschickt", cls: "badge-bad" },
};

const orderPending = { text: "Zahlung offen", cls: "badge-warn" };
const vendorPending = { text: "Bewerbung offen", cls: "badge-warn" };
const vendorActive = { text: "Aktiv", cls: "badge-ok" };
const payoutDraft = { text: "Entwurf", cls: "badge-warn" };
const payoutPaid = { text: "Überwiesen", cls: "badge-ok" };

export function StatusBadge({ status, kind }: { status: ProductStatus | OrderStatus | VendorStatus | FulfillmentStatus | PayoutStatus; kind?: "order" | "vendor" | "payout" }) {
  let entry = labels[status] ?? { text: status, cls: "badge-muted" };
  if (kind === "order" && status === "PENDING") entry = orderPending;
  if (kind === "vendor" && status === "PENDING") entry = vendorPending;
  if (kind === "vendor" && status === "ACTIVE") entry = vendorActive;
  if (kind === "payout" && status === "DRAFT") entry = payoutDraft;
  if (kind === "payout" && status === "PAID") entry = payoutPaid;
  return <span className={`badge ${entry.cls}`}>{entry.text}</span>;
}
