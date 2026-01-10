import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UserProfile, TelegramConnectResponse } from '@/types'

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<{ data: UserProfile }>('/api/user/profile')
      return data.data
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name?: string; email?: string }) => {
      const { data } = await api.put<{ data: UserProfile }>('/api/user/profile', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useConnectTelegram() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: TelegramConnectResponse }>('/api/user/telegram/connect')
      return data.data
    },
  })
}

export function useDisconnectTelegram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.delete('/api/user/telegram/disconnect')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useTestTelegram() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ message: string }>('/api/user/telegram/test')
      return data.message
    },
  })
}
