import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Widerrufsbelehrung" };

export default function Page() {
  return <LegalPage slug="widerruf" title="Widerrufsbelehrung" />;
}
