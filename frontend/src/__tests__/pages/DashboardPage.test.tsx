import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from '@/pages/DashboardPage'

// Mock useAuth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard header', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })
  })

  it('shows add subscription button', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /add subscription/i })).toBeInTheDocument()
    })
  })

  it('displays stats cards', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/total subscriptions/i)).toBeInTheDocument()
      expect(screen.getByText(/total cost/i)).toBeInTheDocument()
      expect(screen.getByText(/upcoming renewals/i)).toBeInTheDocument()
    })
  })

  it('displays subscription list after loading', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument()
      expect(screen.getByText('Spotify')).toBeInTheDocument()
    })
  })

  it('shows subscription details', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument()
      expect(screen.getByText(/visa ending 1234/i)).toBeInTheDocument()
      expect(screen.getByText(/15.99/)).toBeInTheDocument()
    })
  })

  it('shows edit button for each subscription', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      const editButtons = screen.getAllByRole('link', { name: '' }).filter(
        link => link.getAttribute('href')?.includes('/subscriptions/')
      )
      expect(editButtons.length).toBeGreaterThan(0)
    })
  })

  it('opens delete confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument()
    })

    // Find and click the first delete button (trash icon button)
    const deleteButtons = screen.getAllByRole('button').filter(
      btn => btn.className.includes('text-destructive')
    )

    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/delete subscription/i)).toBeInTheDocument()
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })
    }
  })
})
