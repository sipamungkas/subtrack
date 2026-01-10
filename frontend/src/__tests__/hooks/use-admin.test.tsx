import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStats, useAdminUsers } from '@/hooks/use-admin'
import { mockAdminStats, mockAdminUsers } from '../mocks/handlers'

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

describe('useAdminStats', () => {
  it('fetches admin statistics', async () => {
    const { result } = renderHook(() => useAdminStats(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.users.total).toBe(mockAdminStats.users.total)
    expect(result.current.data?.users.active).toBe(mockAdminStats.users.active)
    expect(result.current.data?.subscriptions.total).toBe(mockAdminStats.subscriptions.total)
    expect(result.current.data?.notifications.successRate).toBe(mockAdminStats.notifications.successRate)
  })
})

describe('useAdminUsers', () => {
  it('fetches admin users with pagination', async () => {
    const { result } = renderHook(() => useAdminUsers(1, 20), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(mockAdminUsers.length)
    expect(result.current.data?.pagination.page).toBe(1)
    expect(result.current.data?.pagination.limit).toBe(20)
    expect(result.current.data?.pagination.total).toBe(mockAdminUsers.length)
  })

  it('returns user details with subscription count', async () => {
    const { result } = renderHook(() => useAdminUsers(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const firstUser = result.current.data?.data[0]
    expect(firstUser?.email).toBe('test@example.com')
    expect(firstUser?.subscriptionCount).toBe(2)
    expect(firstUser?.telegramConnected).toBe(false)
  })
})
