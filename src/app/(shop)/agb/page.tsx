import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Allgemeine Geschäftsbedingungen" };

export default function Page() {
  return <LegalPage slug="agb" title="Allgemeine Geschäftsbedingungen" />;
}
