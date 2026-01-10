import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'

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

describe('AdminUsersPage', () => {
  it('renders admin users page header', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /user management/i })).toBeInTheDocument()
    })
  })

  it('shows back button to admin dashboard', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      const backLink = screen.getByRole('link', { name: '' })
      expect(backLink).toHaveAttribute('href', '/admin/dashboard')
    })
  })

  it('displays all users section', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText(/all users/i)).toBeInTheDocument()
    })
  })

  it('shows user list after loading', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    })
  })

  it('displays admin badge for admin users', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('shows telegram connected status', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })

  it('shows limit button for each user', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      const limitButtons = screen.getAllByRole('button', { name: /limit/i })
      expect(limitButtons.length).toBeGreaterThan(0)
    })
  })

  it('shows activate/deactivate buttons', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      expect(deactivateButtons.length).toBeGreaterThan(0)
    })
  })

  it('opens limit dialog when clicking limit button', async () => {
    const user = userEvent.setup()
    render(<AdminUsersPage />)

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    const limitButtons = screen.getAllByRole('button', { name: /limit/i })
    await user.click(limitButtons[0])

    await waitFor(() => {
      expect(screen.getByText(/update subscription limit/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/new limit/i)).toBeInTheDocument()
    })
  })

  it('shows subscription count for each user', async () => {
    render(<AdminUsersPage />)

    await waitFor(() => {
      // User has 2/15 subscriptions
      expect(screen.getByText('2/15')).toBeInTheDocument()
      // Admin has 10/100 subscriptions
      expect(screen.getByText('10/100')).toBeInTheDocument()
    })
  })
})
