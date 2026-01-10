import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { RegisterPage } from '@/pages/RegisterPage'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('RegisterPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders registration form', () => {
    render(<RegisterPage />)

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows feature list', () => {
    render(<RegisterPage />)

    expect(screen.getByText(/track unlimited subscriptions/i)).toBeInTheDocument()
    expect(screen.getByText(/telegram reminders/i)).toBeInTheDocument()
    expect(screen.getByText(/payment method tracking/i)).toBeInTheDocument()
    expect(screen.getByText(/free forever/i)).toBeInTheDocument()
  })

  it('shows link to login page', () => {
    render(<RegisterPage />)

    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('allows user to fill out the form', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword123')

    expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe')
    expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com')
    expect(screen.getByLabelText(/password/i)).toHaveValue('securepassword123')
  })

  it('submits the form and navigates to dashboard', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows password requirements', () => {
    render(<RegisterPage />)

    expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument()
  })
})
