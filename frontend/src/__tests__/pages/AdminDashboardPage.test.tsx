import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'

// Mock useAuth for admin user
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('AdminDashboardPage', () => {
  it('renders admin dashboard header', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument()
    })
  })

  it('shows manage users button', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
    })
  })

  it('displays user statistics', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/total users/i)).toBeInTheDocument()
      expect(screen.getByText(/active users/i)).toBeInTheDocument()
      expect(screen.getByText(/with telegram/i)).toBeInTheDocument()
    })
  })

  it('displays subscription statistics', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/total subscriptions/i)).toBeInTheDocument()
      expect(screen.getByText(/average per user/i)).toBeInTheDocument()
    })
  })

  it('displays notification statistics', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/total sent/i)).toBeInTheDocument()
      expect(screen.getByText(/today/i)).toBeInTheDocument()
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
      expect(screen.getByText(/success rate/i)).toBeInTheDocument()
    })
  })

  it('shows correct stat values', async () => {
    render(<AdminDashboardPage />)

    await waitFor(() => {
      // User stats - use getAllByText for values that appear multiple times
      expect(screen.getByText('100')).toBeInTheDocument() // total users
      expect(screen.getByText('95')).toBeInTheDocument() // active users
      expect(screen.getByText('50')).toBeInTheDocument() // with telegram

      // Subscription stats
      expect(screen.getByText('500')).toBeInTheDocument() // total subscriptions

      // Notification stats
      expect(screen.getByText('1000')).toBeInTheDocument() // total sent
      expect(screen.getByText('25')).toBeInTheDocument() // today
      // 5 appears twice (subscriptions averagePerUser and failed), so use getAllByText
      const fiveElements = screen.getAllByText('5')
      expect(fiveElements.length).toBeGreaterThan(0)
      expect(screen.getByText('99.5%')).toBeInTheDocument() // success rate
    })
  })
})
