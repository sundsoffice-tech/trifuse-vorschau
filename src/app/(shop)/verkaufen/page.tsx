import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getSettingNumber } from "@/lib/settings";
import { VendorApplyForm } from "@/components/forms/vendor-apply-form";

export const metadata: Metadata = { title: "Selbst verkaufen" };

export default async function SellPage() {
  const commission = await getSettingNumber("commission_percent");
  const makerPercent = Math.round(100 - commission);
  return (
    <div className="container-x py-10">
      <div className="grid lg:grid-cols-[1fr_440px] gap-10">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">Du machst es.<br />Wir verkaufen es mit&nbsp;dir.</h1>
          <p className="text-ink-2 text-lg mt-4 max-w-[60ch]">Du stellst deine Produkte ein, wir übernehmen Kasse, Verpackung, Versand und Kundendienst. Du siehst jeden Verkauf mit deinem Anteil in Euro und bekommst ihn gesammelt überwiesen.</p>
          <ol className="mt-8 space-y-5">
            {[
              ["Bewerben", `Kurzes Formular. Wir antworten innerhalb von ${BRAND.applyResponseDays} Werktagen und schicken dir dann deinen Zugang.`],
              ["Produkte einstellen", "In deinem Bereich legst du Produkte mit Fotos, Preis und Bestand an. Wir schauen kurz drüber und schalten frei."],
              ["Ware zu uns bringen oder selbst verschicken", "Deine Produkte lagern bei uns in Mönchengladbach und gehen mit anderen Bestellungen in einem Paket raus. Wenn du lieber selbst verschickst, sagen wir dir bei jedem Verkauf Bescheid."],
              ["Verkaufen und Geld bekommen", `${makerPercent} % jedes Verkaufspreises gehen an dich, ${commission} % decken Verpackung, Versand, Zahlung und Kundendienst. Die Auszahlung kommt gesammelt, jeder Verkauf einzeln aufgeführt.`],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-4">
                <span className="marker mt-2 shrink-0" aria-hidden="true" />
                <div><p className="font-semibold">{t}</p><p className="text-ink-2">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-6 md:p-7 h-fit">
          <h2 className="font-semibold text-lg">Bewerben</h2>
          <p className="text-sm text-ink-2 mt-1 mb-5">Kein Passwort nötig. Deinen Zugang bekommst du mit der Zusage per E-Mail.</p>
          <VendorApplyForm />
        </div>
      </div>
    </div>
  );
}
