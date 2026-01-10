import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />)

    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    // Input defaults to text type when not specified (HTML spec doesn't require type attribute)
    expect(input.tagName).toBe('INPUT')
  })

  it('renders different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" data-testid="input" />)
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number')
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input data-testid="input" />)

    const input = screen.getByTestId('input')
    await user.type(input, 'Hello World')

    expect(input).toHaveValue('Hello World')
  })

  it('can be disabled', () => {
    render(<Input disabled data-testid="input" />)

    const input = screen.getByTestId('input')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-50')
  })

  it('applies correct styling', () => {
    render(<Input data-testid="input" />)

    const input = screen.getByTestId('input')
    expect(input).toHaveClass('h-11', 'rounded-lg', 'border', 'bg-background')
  })

  it('accepts custom className', () => {
    render(<Input className="custom-input" data-testid="input" />)

    expect(screen.getByTestId('input')).toHaveClass('custom-input')
  })
})
