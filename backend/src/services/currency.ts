import { db } from "../db";
import { currencyRates } from "../db/schema";
import { eq, desc, lt, and } from "drizzle-orm";

interface FixerResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

// Default currencies to always fetch (common ones)
const DEFAULT_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "HKD", "SGD",
  "INR", "KRW", "THB", "MYR", "IDR", "PHP", "VND", "TWD", "BRL", "MXN"
];

/**
 * Fetch exchange rates from Fixer.io API
 * Fixer free tier returns EUR as base, so we convert to USD base
 */
export async function fetchExchangeRates(): Promise<Record<string, number> | null> {
  const apiKey = process.env.FIXER_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ FIXER_API_KEY not set, skipping currency rate fetch");
    return null;
  }

  try {
    const url = `http://data.fixer.io/api/latest?access_key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Fixer API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as FixerResponse;

    if (!data.success) {
      console.error("❌ Fixer API returned unsuccessful response:", data);
      return null;
    }

    // Convert EUR-based rates to USD-based rates
    const usdBasedRates = convertToUSDBase(data.rates);

    console.log(`✅ Fetched ${Object.keys(usdBasedRates).length} exchange rates`);
    return usdBasedRates;
  } catch (error) {
    console.error("❌ Failed to fetch exchange rates:", error);
    return null;
  }
}

/**
 * Convert EUR-based rates from Fixer to USD-based rates
 * Formula: USD → Currency = EUR→Currency / EUR→USD
 */
function convertToUSDBase(eurBasedRates: Record<string, number>): Record<string, number> {
  const eurToUsd = eurBasedRates["USD"];

  if (!eurToUsd) {
    console.error("❌ USD rate not found in Fixer response");
    return {};
  }

  const usdBasedRates: Record<string, number> = {};

  for (const [currency, eurRate] of Object.entries(eurBasedRates)) {
    // USD → Currency = EUR→Currency / EUR→USD
    usdBasedRates[currency] = eurRate / eurToUsd;
  }

  return usdBasedRates;
}

/**
 * Store exchange rates in the database
 */
export async function updateRates(rates: Record<string, number>): Promise<void> {
  const fetchedAt = new Date();

  const rateRecords = Object.entries(rates).map(([currency, rate]) => ({
    baseCurrency: "USD",
    targetCurrency: currency,
    rate: rate.toString(),
    fetchedAt,
  }));

  // Insert all rates
  await db.insert(currencyRates).values(rateRecords);

  console.log(`💾 Stored ${rateRecords.length} exchange rates`);
}

/**
 * Fetch and update all exchange rates
 */
export async function refreshExchangeRates(): Promise<boolean> {
  console.log("🔄 Refreshing exchange rates...");

  const rates = await fetchExchangeRates();

  if (!rates) {
    console.warn("⚠️ Using existing rates (fetch failed)");
    return false;
  }

  await updateRates(rates);
  return true;
}

/**
 * Get the latest exchange rate for a currency pair
 */
export async function getLatestRate(
  targetCurrency: string,
  baseCurrency: string = "USD"
): Promise<number | null> {
  // If same currency, rate is 1
  if (targetCurrency === baseCurrency) {
    return 1;
  }

  const result = await db
    .select()
    .from(currencyRates)
    .where(
      and(
        eq(currencyRates.baseCurrency, baseCurrency),
        eq(currencyRates.targetCurrency, targetCurrency)
      )
    )
    .orderBy(desc(currencyRates.fetchedAt))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return parseFloat(result[0].rate);
}

/**
 * Get all latest exchange rates
 */
export async function getAllLatestRates(): Promise<{ rates: Record<string, number>; updatedAt: Date | null }> {
  // Get the most recent fetch time
  const latestFetch = await db
    .select({ fetchedAt: currencyRates.fetchedAt })
    .from(currencyRates)
    .orderBy(desc(currencyRates.fetchedAt))
    .limit(1);

  if (latestFetch.length === 0) {
    return { rates: {}, updatedAt: null };
  }

  const updatedAt = latestFetch[0].fetchedAt;

  // Get all rates from the latest fetch
  const result = await db
    .select()
    .from(currencyRates)
    .where(eq(currencyRates.fetchedAt, updatedAt));

  const rates: Record<string, number> = {};
  for (const row of result) {
    rates[row.targetCurrency] = parseFloat(row.rate);
  }

  return { rates, updatedAt };
}

/**
 * Convert an amount from one currency to another
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string = "USD"
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // If converting TO USD, we need the rate from USD to fromCurrency
  // Then divide the amount by that rate
  if (toCurrency === "USD") {
    const rate = await getLatestRate(fromCurrency, "USD");
    if (rate === null) {
      console.warn(`⚠️ No rate found for ${fromCurrency}, treating as 1:1 with USD`);
      return amount;
    }
    return amount / rate;
  }

  // If converting FROM USD to another currency
  if (fromCurrency === "USD") {
    const rate = await getLatestRate(toCurrency, "USD");
    if (rate === null) {
      console.warn(`⚠️ No rate found for ${toCurrency}, treating as 1:1 with USD`);
      return amount;
    }
    return amount * rate;
  }

  // For other conversions, go through USD
  const amountInUSD = await convertAmount(amount, fromCurrency, "USD");
  return convertAmount(amountInUSD, "USD", toCurrency);
}

/**
 * Prune old exchange rates (older than specified days)
 */
export async function pruneOldRates(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await db
    .delete(currencyRates)
    .where(lt(currencyRates.fetchedAt, cutoffDate));

  // Drizzle returns the deleted rows, so we count them
  const deletedCount = Array.isArray(result) ? result.length : 0;

  if (deletedCount > 0) {
    console.log(`🧹 Pruned ${deletedCount} old exchange rate records`);
  }

  return deletedCount;
}
