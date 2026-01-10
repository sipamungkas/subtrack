import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminStats, AdminUser, PaginatedResponse } from '@/types'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminStats }>('/api/admin/stats')
      return data.data
    },
  })
}

export function useAdminUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['admin-users', page, limit],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AdminUser>>(
        `/api/admin/users?page=${page}&limit=${limit}`
      )
      return data
    },
  })
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser }>(`/api/admin/users/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useUpdateUserLimit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, subscriptionLimit }: { userId: string; subscriptionLimit: number }) => {
      const { data } = await api.put(`/api/admin/users/${userId}/limit`, { subscriptionLimit })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data } = await api.put(`/api/admin/users/${userId}/status`, { isActive })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}
