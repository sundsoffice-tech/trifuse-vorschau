import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = { title: "Datenschutz" };

export default function Page() {
  return <LegalPage slug="datenschutz" title="Datenschutz" />;
}
