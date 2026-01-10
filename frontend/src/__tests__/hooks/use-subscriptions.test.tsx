import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSubscriptions, useSubscription, useSubscriptionStats } from '@/hooks/use-subscriptions'
import { mockSubscriptions, mockStats } from '../mocks/handlers'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useSubscriptions', () => {
  it('fetches subscriptions successfully', async () => {
    const { result } = renderHook(() => useSubscriptions(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(mockSubscriptions.length)
    expect(result.current.data?.[0].serviceName).toBe('Netflix')
    expect(result.current.data?.[1].serviceName).toBe('Spotify')
  })

  it('filters active subscriptions', async () => {
    const { result } = renderHook(() => useSubscriptions({ active: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.every(sub => sub.isActive)).toBe(true)
  })
})

describe('useSubscription', () => {
  it('fetches a single subscription by id', async () => {
    const { result } = renderHook(() => useSubscription('sub-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe('sub-1')
    expect(result.current.data?.serviceName).toBe('Netflix')
  })

  it('returns error for non-existent subscription', async () => {
    const { result } = renderHook(() => useSubscription('non-existent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useSubscriptionStats', () => {
  it('fetches subscription stats', async () => {
    const { result } = renderHook(() => useSubscriptionStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.totalSubscriptions).toBe(mockStats.totalSubscriptions)
    expect(result.current.data?.monthlyCost.amount).toBe(mockStats.monthlyCost.amount)
    expect(result.current.data?.upcomingRenewals).toHaveLength(2)
  })
})
