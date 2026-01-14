import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updatedAt: string | null;
}

export function useCurrencyConverter() {
  const { data: ratesData, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data } = await api.get<{ data: ExchangeRates }>("/api/currencies/rates");
      return data.data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const convert = (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number => {
    // Validate input
    if (isNaN(amount) || amount < 0) {
      console.warn(`Invalid amount: ${amount}`);
      return amount;
    }

    if (fromCurrency === toCurrency || amount === 0) {
      return amount;
    }

    if (!ratesData?.rates) {
      console.warn("Exchange rates not loaded, returning original amount");
      return amount;
    }

    const rates = ratesData.rates;

    // Convert to USD first (base currency)
    let amountInUSD = amount;
    if (fromCurrency !== "USD") {
      const fromRate = rates[fromCurrency];
      if (!fromRate) {
        console.warn(`No rate found for ${fromCurrency}`);
        return amount;
      }
      amountInUSD = amount / fromRate;
    }

    // Convert from USD to target currency
    if (toCurrency === "USD") {
      return amountInUSD;
    }

    const toRate = rates[toCurrency];
    if (!toRate) {
      console.warn(`No rate found for ${toCurrency}`);
      return amountInUSD;
    }

    return amountInUSD * toRate;
  };

  return {
    convert,
    isLoading,
    rates: ratesData?.rates,
    updatedAt: ratesData?.updatedAt,
  };
}
