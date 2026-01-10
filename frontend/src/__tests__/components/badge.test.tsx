import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>)

    const badge = screen.getByText('Default')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-primary')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary')

    rerender(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText('Destructive')).toHaveClass('bg-destructive')

    rerender(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('text-foreground')

    rerender(<Badge variant="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('bg-success')

    rerender(<Badge variant="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toHaveClass('bg-warning')
  })

  it('applies correct base styling', () => {
    render(<Badge data-testid="badge">Test</Badge>)

    const badge = screen.getByTestId('badge')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'px-2.5', 'py-0.5', 'text-xs', 'font-semibold')
  })

  it('accepts custom className', () => {
    render(<Badge className="custom-badge" data-testid="badge">Custom</Badge>)

    expect(screen.getByTestId('badge')).toHaveClass('custom-badge')
  })
})
