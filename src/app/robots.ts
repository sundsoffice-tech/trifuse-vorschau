import type { MetadataRoute } from "next";
import { siteIndexable } from "@/lib/site";
import { appUrl } from "@/modules/payments/provider";

export default function robots(): MetadataRoute.Robots {
  // Kasse, Konto und Verwaltung nie; der Rest erst nach Freigabe.
  const privat = ["/admin", "/portal", "/api/", "/warenkorb", "/kasse", "/bestellung/", "/login", "/passwort-vergessen", "/passwort-neu/"];
  if (!siteIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: privat }, sitemap: appUrl("/sitemap.xml") };
}
