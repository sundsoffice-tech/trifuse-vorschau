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
      <Alert tone={mode === "stripe" ? "ok" : "warn"}>Zahlung: {mode === "stripe" ? "Stripe (echt)" : "Testmodus ohne Geldfluss"}. Umschalten über die Umgebungsvariablen PAYMENTS_MODE, STRIPE_SECRET_KEY und STRIPE_WEBHOOK_SECRET.</Alert>
      <SettingsForm settings={s} />
    </div>
  );
}
