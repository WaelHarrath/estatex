export function formatMoney(cents: bigint, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(cents) / 100);
}
