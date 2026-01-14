import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrencyConverter } from '../use-currency-converter';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useCurrencyConverter', () => {

  it('should convert USD to EUR', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(100, 'USD', 'EUR');
    expect(converted).toBeCloseTo(85, 0);
  });

  it('should convert EUR to USD', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(100, 'EUR', 'USD');
    expect(converted).toBeCloseTo(117.65, 0);
  });

  it('should return same amount when currencies match', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(100, 'USD', 'USD');
    expect(converted).toBe(100);
  });

  it('should convert IDR to USD', async () => {
    const { result } = renderHook(() => useCurrencyConverter(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const converted = result.current.convert(15000, 'IDR', 'USD');
    expect(converted).toBeCloseTo(1, 0);
  });
});
