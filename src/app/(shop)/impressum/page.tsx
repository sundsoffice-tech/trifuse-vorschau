import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Impressum" };

export default function Page() {
  return <LegalPage slug="impressum" title="Impressum" />;
}
