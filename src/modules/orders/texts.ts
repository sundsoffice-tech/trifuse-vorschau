import type { FulfillmentStatus, ShippingBy } from "@prisma/client";

/** Was der Macher zu einem Verkauf wissen muss: ob er etwas tun muss (Künstler-Fund 29). */
export function fulfillmentText(status: FulfillmentStatus, shippingBy: ShippingBy): string {
  if (shippingBy === "WAREHOUSE") {
    if (status === "NEW" || status === "PACKED") return "Wird von uns verschickt, du musst nichts tun";
    if (status === "SHIPPED") return "Von uns verschickt";
    if (status === "DELIVERED") return "Zugestellt";
    return "Zurückgeschickt";
  }
  if (status === "NEW" || status === "PACKED") return "Bitte verschicken und als verschickt markieren";
  if (status === "SHIPPED") return "Von dir verschickt";
  if (status === "DELIVERED") return "Zugestellt";
  return "Zurückgeschickt";
}
