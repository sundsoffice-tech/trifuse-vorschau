/**
 * Reine Rechenregeln für Rückbuchungen. Eine Bestellposition trägt eingefrorene Beträge (Verkaufspreis,
 * Provision, Macheranteil). Wird ein Teil der Stückzahl zurückgebucht, bekommt die Rückbuchung den
 * anteiligen Betrag; die letzte Rückbuchung nimmt genau den Rest, damit alle Rückbuchungen zusammen
 * exakt die Position ergeben. Niemals neu aus dem Prozentsatz rechnen (CLAUDE.md, Vorgabe 3).
 */
export type FrozenAmounts = { quantity: number; lineTotalCents: number; commissionCents: number };

export function reversalAmounts(item: FrozenAmounts, alreadyReversed: FrozenAmounts, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Die Stückzahl muss mindestens 1 sein.");
  const remainingQty = item.quantity - alreadyReversed.quantity;
  if (quantity > remainingQty) throw new Error(`Von dieser Position sind nur noch ${remainingQty} Stück offen.`);
  const remainingLine = item.lineTotalCents - alreadyReversed.lineTotalCents;
  const remainingCommission = item.commissionCents - alreadyReversed.commissionCents;
  const lineTotalCents = quantity === remainingQty ? remainingLine : Math.round((remainingLine * quantity) / remainingQty);
  const commissionCents = quantity === remainingQty ? remainingCommission : Math.round((remainingCommission * quantity) / remainingQty);
  return { lineTotalCents, commissionCents, vendorNetCents: lineTotalCents - commissionCents };
}

/** Summe mehrerer Rückbuchungen (Beträge werden positiv erwartet). */
export function sumFrozen(list: FrozenAmounts[]): FrozenAmounts {
  return list.reduce((a, r) => ({ quantity: a.quantity + r.quantity, lineTotalCents: a.lineTotalCents + r.lineTotalCents, commissionCents: a.commissionCents + r.commissionCents }), { quantity: 0, lineTotalCents: 0, commissionCents: 0 });
}
