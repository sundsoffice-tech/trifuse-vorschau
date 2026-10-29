// Eigene Marke des Marktplatzes. Bewusst getrennt von trifuse: trifuse ist der
// Betreiber im Hintergrund, nach aussen tritt der Marktplatz unter eigenem Namen auf.
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Marktplatz",
  claim: "Ausgewählte Produkte kleiner Marken. Eine Kasse, ein Paket.",
  operator: "trifuse",
  supportEmail: process.env.SUPPORT_EMAIL ?? "service@example.com",
};
