import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProfile, useConnectTelegram } from '@/hooks/use-user'
import { mockUser } from '../mocks/handlers'

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

describe('useProfile', () => {
  it('fetches user profile', async () => {
    const { result } = renderHook(() => useProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe(mockUser.id)
    expect(result.current.data?.email).toBe(mockUser.email)
    expect(result.current.data?.name).toBe(mockUser.name)
    expect(result.current.data?.subscriptionLimit).toBe(15)
  })
})

describe('useConnectTelegram', () => {
  it('generates telegram verification code', async () => {
    const { result } = renderHook(() => useConnectTelegram(), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.code).toBe('ABC12345')
    expect(result.current.data?.botUsername).toBe('SubTrackBot')
    expect(result.current.data?.message).toContain('/start ABC12345')
  })
})
