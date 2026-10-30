/**
 * SEPA-Überweisungsdatei pain.001.001.09 (gültig bei deutschen Banken seit November 2023, DK-Regelwerk).
 * Reine Funktion ohne Datenbank; Beträge in Cent. IBAN-only ist in der EU zulässig, BIC optional.
 */
export type SepaTransfer = { endToEndId: string; name: string; iban: string; amountCents: number; remittance: string };
export type SepaDebtor = { name: string; iban: string; bic?: string };

/** Erlaubter SEPA-Zeichensatz; Umlaute werden umgeschrieben, Unbekanntes wird zu Leerzeichen. */
export function sepaText(input: string, max = 140): string {
  const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", "&": "+", "€": "EUR" };
  return input
    .replace(/[äöüÄÖÜß&€]/g, (c) => map[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const amount = (cents: number) => (cents / 100).toFixed(2);

export function buildPain001(opts: { msgId: string; createdAt: Date; executionDate: string; debtor: SepaDebtor; transfers: SepaTransfer[] }): string {
  const { msgId, debtor, transfers } = opts;
  if (transfers.length === 0) throw new Error("Keine Überweisungen.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.executionDate)) throw new Error("Ausführungsdatum muss JJJJ-MM-TT sein.");
  for (const t of transfers) if (!Number.isInteger(t.amountCents) || t.amountCents <= 0) throw new Error(`Betrag für ${t.name} muss positiv sein.`);
  const total = transfers.reduce((s, t) => s + t.amountCents, 0);
  const agent = debtor.bic ? `<BICFI>${esc(debtor.bic.replace(/\s/g, "").toUpperCase())}</BICFI>` : `<Othr><Id>NOTPROVIDED</Id></Othr>`;
  const txs = transfers
    .map(
      (t) => `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${esc(sepaText(t.endToEndId, 35))}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${amount(t.amountCents)}</InstdAmt></Amt>
        <Cdtr><Nm>${esc(sepaText(t.name, 70))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${esc(t.iban.replace(/\s/g, "").toUpperCase())}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${esc(sepaText(t.remittance, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09 pain.001.001.09.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${esc(sepaText(msgId, 35))}</MsgId>
      <CreDtTm>${opts.createdAt.toISOString().slice(0, 19)}</CreDtTm>
      <NbOfTxs>${transfers.length}</NbOfTxs>
      <CtrlSum>${amount(total)}</CtrlSum>
      <InitgPty><Nm>${esc(sepaText(debtor.name, 70))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(sepaText(msgId, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${transfers.length}</NbOfTxs>
      <CtrlSum>${amount(total)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${opts.executionDate}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${esc(sepaText(debtor.name, 70))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${esc(debtor.iban.replace(/\s/g, "").toUpperCase())}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId>${agent}</FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${txs}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}
