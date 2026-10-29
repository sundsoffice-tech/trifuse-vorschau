import { getAllSettings } from "@/lib/settings";
import { paymentsMode } from "@/modules/payments";
import { SettingsForm } from "@/components/forms/settings-form";
import { Alert } from "@/components/ui/alert";

export default async function AdminSettings() {
  const s = await getAllSettings();
  const mode = paymentsMode();
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Einstellungen</h1></div>
      <Alert tone={mode === "stripe" ? "ok" : "warn"}>{mode === "stripe" ? "Echte Zahlungen über Stripe sind eingeschaltet." : "Echte Zahlungen sind noch aus. Kunden sehen eine Testkasse ohne Geldfluss. Zum Einschalten bitte an die Technik wenden (Stripe-Zugang hinterlegen)."}</Alert>
      <SettingsForm settings={s} />
    </div>
  );
}
