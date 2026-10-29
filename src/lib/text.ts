/** „1 Produkt“, „2 Produkte“: nie wieder „1 Produkte“ (Künstler-Fund 42). */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
