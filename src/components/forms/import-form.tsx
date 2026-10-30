"use client";

import { useActionState } from "react";
import { importCheckAction, importRunAction, type ImportState } from "@/modules/catalog/import-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { formatCents } from "@/lib/money";

export function ImportForm({ example }: { example: string }) {
  const [state, check] = useActionState(importCheckAction, null as ImportState);
  const [done, run] = useActionState(importRunAction, null as ImportState);
  const result = done ?? state;
  const ok = result?.rows.filter((r) => r.errors.length === 0) ?? [];
  const bad = result?.rows.filter((r) => r.errors.length > 0) ?? [];
  return (
    <div className="space-y-6">
      <form action={check} className="card p-5 md:p-6 space-y-4">
        <div>
          <label className="label" htmlFor="file">CSV-Datei</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv" className="block text-sm" />
          <p className="hint">Spalten: macher (Slug, E-Mail oder Name), titel, beschreibung, preis, bestand, art (Slug oder Name), artikelnummer, versand (lager oder selbst), inhalt_menge, inhalt_einheit, status (shop, freigabe oder entwurf). Semikolon oder Komma, Excel-Export geht direkt.</p>
        </div>
        <div>
          <label className="label" htmlFor="text">Oder Zeilen hier einfügen</label>
          <textarea id="text" name="text" className="textarea font-mono !text-xs !min-h-[140px]" defaultValue={result?.step === "check" && result.text ? result.text : ""} placeholder={example} />
        </div>
        <SubmitButton className="btn btn-secondary" pendingText="Prüft …">Prüfen, noch nichts anlegen</SubmitButton>
      </form>

      {result?.message ? <Alert tone="warn">{result.message}</Alert> : null}
      {result?.step === "done" ? <Alert tone="ok">{result.created} {result.created === 1 ? "Produkt" : "Produkte"} angelegt{result.skipped ? `, ${result.skipped} mit Fehlern übersprungen` : ""}.</Alert> : null}

      {result && result.rows.length > 0 ? (
        <section className="card">
          <div className="p-4 border-b border-line flex flex-wrap items-center gap-3">
            <h2 className="font-semibold">{result.rows.length} Zeilen: {ok.length} in Ordnung, {bad.length} mit Fehlern</h2>
            {result.step === "check" && ok.length > 0 ? (
              <form action={run} className="ml-auto"><input type="hidden" name="text" value={result.text} /><SubmitButton className="btn btn-primary" pendingText="Legt an …">{ok.length} {ok.length === 1 ? "Produkt" : "Produkte"} anlegen</SubmitButton></form>
            ) : null}
          </div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Zeile</th><th>Macher</th><th>Titel</th><th className="nowrap">Preis</th><th>Bestand</th><th>Art</th><th>Stand</th><th>Prüfung</th></tr></thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.line}>
                  <td className="num">{r.line}</td>
                  <td>{r.vendorName ?? r.input.macher}</td>
                  <td>{r.input.titel}</td>
                  <td className="nowrap">{r.data ? formatCents(r.data.priceCents) : r.input.preis}</td>
                  <td className="num">{r.input.bestand}</td>
                  <td>{r.input.art}</td>
                  <td>{r.status === "ACTIVE" ? "im Shop" : r.status === "PENDING" ? "zur Freigabe" : "Entwurf"}</td>
                  <td>{r.errors.length === 0 ? <span className="badge badge-ok">in Ordnung</span> : <ul className="text-xs text-bad list-disc pl-4">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      ) : null}
    </div>
  );
}
