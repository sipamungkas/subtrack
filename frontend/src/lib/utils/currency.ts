export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  IDR: "Rp",
  AUD: "A$",
  SGD: "S$",
};

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "IDR",
  "AUD",
  "SGD",
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function formatCurrency(
  amount: number,
  currency: string,
  options?: { minimumFractionDigits?: number }
): string {
  const symbol = getCurrencySymbol(currency);
  const minFractionDigits = options?.minimumFractionDigits ?? 2;

  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: minFractionDigits,
  })}`;
}
