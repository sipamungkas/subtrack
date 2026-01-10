import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Subscription, SubscriptionStats, CreateSubscriptionInput, UpdateSubscriptionInput } from '@/types'

export function useSubscriptions(filters?: { active?: boolean; upcoming?: boolean }) {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.active !== undefined) params.append('active', String(filters.active))
      if (filters?.upcoming) params.append('upcoming', 'true')

      const { data } = await api.get<{ data: Subscription[] }>(
        `/api/subscriptions?${params}`
      )
      return data.data
    },
  })
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: ['subscription', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Subscription }>(`/api/subscriptions/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SubscriptionStats }>('/api/subscriptions/stats')
      return data.data
    },
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSubscriptionInput) => {
      const { data } = await api.post<{ data: Subscription }>('/api/subscriptions', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] })
    },
  })
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSubscriptionInput & { id: string }) => {
      const { data } = await api.put<{ data: Subscription }>(`/api/subscriptions/${id}`, input)
      return data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['subscription', data.id] })
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] })
    },
  })
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/subscriptions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] })
    },
  })
}
