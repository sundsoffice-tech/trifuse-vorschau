import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getSettingNumber } from "@/lib/settings";
import { VendorApplyForm } from "@/components/forms/vendor-apply-form";

export const metadata: Metadata = { title: "Selbst verkaufen" };

export default async function SellPage() {
  const commission = await getSettingNumber("commission_percent");
  return (
    <div className="container-x py-10">
      <div className="grid lg:grid-cols-[1fr_440px] gap-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Für Hersteller</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mt-2 leading-tight">Deine Produkte. Unser Marktplatz.</h1>
          <p className="text-ink-2 text-lg mt-4 max-w-xl">Du stellst deine Produkte ein, wir übernehmen Kasse, Versand und Kundenservice. Du siehst jede verkaufte Position und bekommst deinen Anteil ausgezahlt.</p>
          <ol className="mt-8 space-y-4">
            {[
              ["Bewerben", "Kurzes Formular, wir melden uns innerhalb weniger Tage."],
              ["Produkte einstellen", "Im Händlerbereich legst du Produkte mit Fotos, Preis und Bestand an. Wir prüfen und schalten frei."],
              ["Verkaufen und auszahlen lassen", `Von jedem Verkauf behalten wir ${commission} % Provision. Der Rest wird dir gesammelt überwiesen, jede Position einzeln aufgeführt.`],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="w-9 h-9 rounded-full bg-accent-soft text-accent font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <div><p className="font-semibold">{t}</p><p className="text-ink-2">{d}</p></div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-ink-3 mt-8">{BRAND.name} wird von {BRAND.operator} betrieben. Lagerung und Versand laufen über das Lager von {BRAND.operator}; auf Wunsch versendest du selbst.</p>
        </div>
        <div className="card p-6 md:p-7 h-fit">
          <h2 className="font-semibold text-lg">Als Händler bewerben</h2>
          <p className="text-sm text-ink-2 mt-1 mb-5">Nach der Freischaltung kannst du dich mit diesen Zugangsdaten anmelden.</p>
          <VendorApplyForm />
        </div>
      </div>
    </div>
  );
}
