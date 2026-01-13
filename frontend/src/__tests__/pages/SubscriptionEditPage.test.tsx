import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { SubscriptionEditPage } from '@/pages/SubscriptionEditPage'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock hooks
const mockSubscription = {
  id: '1',
  serviceName: 'Test Subscription',
  cost: '10.00',
  currency: 'USD',
  renewalDate: '2026-02-01',
  billingCycle: 'monthly' as const,
  customIntervalDays: undefined,
  paymentMethod: 'Credit Card',
  accountName: 'test@example.com',
  reminderDays: [7, 3, 1],
  notes: '',
  userId: '1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

vi.mock('@/hooks/use-subscriptions', () => ({
  useSubscription: vi.fn(() => ({ data: mockSubscription, isLoading: false })),
  useUpdateSubscription: vi.fn(() => ({
    mutateAsync: vi.fn(() => Promise.resolve()),
    isPending: false,
  })),
}))

describe('SubscriptionEditPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders the form with existing data', () => {
    render(<SubscriptionEditPage />)

    expect(screen.getByRole('heading', { name: /edit subscription/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/service name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cost/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/account\/email used/i)).toBeInTheDocument()
  })

  it('shows back button to dashboard', () => {
    render(<SubscriptionEditPage />)

    const backLink = screen.getByRole('link', { name: '' })
    expect(backLink).toHaveAttribute('href', '/dashboard')
  })

  it('submits the form with updated data', async () => {
    const user = userEvent.setup()
    render(<SubscriptionEditPage />)

    const serviceNameInput = screen.getByLabelText(/service name/i)
    await user.clear(serviceNameInput)
    await user.type(serviceNameInput, 'Updated Service')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows cancel button that navigates back', () => {
    render(<SubscriptionEditPage />)

    const cancelLink = screen.getByRole('link', { name: /cancel/i })
    expect(cancelLink).toHaveAttribute('href', '/dashboard')
  })

  describe('Custom Interval Days', () => {
    it('shows custom interval field when billing cycle is custom', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      expect(screen.queryByLabelText(/renewal interval \(days\)/i)).not.toBeInTheDocument()

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /custom/i }))

      expect(screen.getByLabelText(/renewal interval \(days\)/i)).toBeInTheDocument()
    })

    it('hides custom interval field for non-custom billing cycles', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /monthly/i }))

      expect(screen.queryByLabelText(/renewal interval \(days\)/i)).not.toBeInTheDocument()

      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /yearly/i }))

      expect(screen.queryByLabelText(/renewal interval \(days\)/i)).not.toBeInTheDocument()
    })

    it('requires customIntervalDays when billing cycle is custom', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /custom/i }))

      const customIntervalInput = screen.getByLabelText(/renewal interval \(days\)/i)
      expect(customIntervalInput).toBeRequired()
    })

    it('prevents non-numeric input in custom interval field', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /custom/i }))

      await user.type(screen.getByLabelText(/renewal interval \(days\)/i), 'abc')

      await waitFor(() => {
        const customIntervalInput = screen.getByLabelText(/renewal interval \(days\)/i)
        expect(customIntervalInput).toHaveValue('')
      })
    })

    it('allows valid numeric input in custom interval field', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /custom/i }))

      await user.type(screen.getByLabelText(/renewal interval \(days\)/i), '45')

      await waitFor(() => {
        const customIntervalInput = screen.getByLabelText(/renewal interval \(days\)/i)
        expect(customIntervalInput).toHaveValue(45)
      })
    })
    })

    it('allows valid numeric input in custom interval field', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /custom/i }))

      const customIntervalInput = screen.getByLabelText(/renewal interval \(days\)/i)
      await user.type(customIntervalInput, '45')

      await waitFor(() => {
        expect(customIntervalInput).toHaveValue(45)
      })
    })
    })

    it('submits form with customIntervalDays when billing cycle is custom', async () => {
      const user = userEvent.setup()
      render(<SubscriptionEditPage />)

      const billingCycleLabel = screen.getByText(/billing cycle/i)
      const billingCycleSelect = billingCycleLabel.nextElementSibling as HTMLElement
      await user.click(billingCycleSelect)
      await user.click(screen.getByRole('option', { name: /custom/i }))

      await user.type(screen.getByLabelText(/renewal interval \(days\)/i), '30')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})
