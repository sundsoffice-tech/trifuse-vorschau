import { AdminVendorCreateForm } from "@/components/forms/admin-vendor-forms";

export default function AdminNewVendor() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl font-semibold">Händler anlegen</h1><p className="text-ink-2">Der Händler ist sofort aktiv. Das Startpasswort wird einmalig angezeigt, danach selbst änderbar.</p></div>
      <AdminVendorCreateForm />
    </div>
  );
}
