import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from '@/pages/ProfilePage'

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
    refreshUser: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('ProfilePage', () => {
  it('renders profile page header', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
    })
  })

  it('displays account information section', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/account information/i)).toBeInTheDocument()
    })
  })

  it('shows email field as disabled', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      const emailInput = screen.getByDisplayValue('test@example.com')
      expect(emailInput).toBeDisabled()
    })
  })

  it('displays subscription usage section', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/subscription usage/i)).toBeInTheDocument()
      expect(screen.getByText(/active subscriptions/i)).toBeInTheDocument()
    })
  })

  it('displays telegram notifications section', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText(/telegram notifications/i)).toBeInTheDocument()
    })
  })

  it('shows connect telegram button when not connected', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect telegram/i })).toBeInTheDocument()
    })
  })

  it('allows updating display name', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/display name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Name')

    expect(nameInput).toHaveValue('Updated Name')
  })

  it('shows save changes button', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })
  })
})
