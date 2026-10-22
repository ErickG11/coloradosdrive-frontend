// Formato único de moneda (USD) para toda la app: punto decimal y coma de miles
// ($190.00, $1,000.00). Locale fijo "en-US" para que no dependa del navegador.
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const MONEY_FALLBACK = "—";

export function formatMoney(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return MONEY_FALLBACK;
  return USD.format(value);
}

export function formatMoneyFromCents(cents: number | null | undefined): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return MONEY_FALLBACK;
  return formatMoney(cents / 100);
}
