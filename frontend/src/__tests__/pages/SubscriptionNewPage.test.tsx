import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { SubscriptionNewPage } from '@/pages/SubscriptionNewPage'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('SubscriptionNewPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders the form', () => {
    render(<SubscriptionNewPage />)

    expect(screen.getByRole('heading', { name: /add subscription/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/service name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cost/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/account\/email used/i)).toBeInTheDocument()
  })

  it('shows back button to dashboard', () => {
    render(<SubscriptionNewPage />)

    const backLink = screen.getByRole('link', { name: '' })
    expect(backLink).toHaveAttribute('href', '/dashboard')
  })

  it('shows reminder day options', () => {
    render(<SubscriptionNewPage />)

    expect(screen.getByRole('button', { name: /1 day before/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /3 days before/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /7 days before/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /14 days before/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /30 days before/i })).toBeInTheDocument()
  })

  it('allows toggling reminder days', async () => {
    const user = userEvent.setup()
    render(<SubscriptionNewPage />)

    // 7, 3, and 1 days are selected by default
    const day14Button = screen.getByRole('button', { name: /14 days before/i })
    expect(day14Button).not.toHaveClass('bg-primary')

    await user.click(day14Button)

    // After clicking, it should be selected (have primary variant styling)
    expect(day14Button).toHaveClass('bg-primary')
  })

  it('submits the form with valid data', async () => {
    const user = userEvent.setup()
    render(<SubscriptionNewPage />)

    await user.type(screen.getByLabelText(/service name/i), 'GitHub Pro')
    await user.type(screen.getByLabelText(/cost/i), '4.00')
    await user.type(screen.getByLabelText(/next renewal date/i), '2026-02-01')
    await user.type(screen.getByLabelText(/payment method/i), 'Credit Card')
    await user.type(screen.getByLabelText(/account\/email used/i), 'dev@example.com')

    await user.click(screen.getByRole('button', { name: /create subscription/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows cancel button that navigates back', () => {
    render(<SubscriptionNewPage />)

    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    expect(cancelLink).toHaveAttribute('href', '/dashboard')
  })
})
