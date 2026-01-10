import { describe, it, expect } from 'vitest'
import { render, screen } from '../test-utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card', () => {
  it('renders card with all sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content here</p>
        </CardContent>
        <CardFooter>
          <button>Footer Button</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Card content here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /footer button/i })).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">Title</CardTitle>
          <CardDescription data-testid="description">Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">Content</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    )

    expect(screen.getByTestId('card')).toHaveClass('rounded-xl', 'border', 'bg-card')
    expect(screen.getByTestId('header')).toHaveClass('p-6')
    expect(screen.getByTestId('title')).toHaveClass('font-semibold')
    expect(screen.getByTestId('description')).toHaveClass('text-muted-foreground')
    expect(screen.getByTestId('content')).toHaveClass('p-6', 'pt-0')
    expect(screen.getByTestId('footer')).toHaveClass('p-6', 'pt-0')
  })

  it('accepts custom className', () => {
    render(
      <Card className="custom-class" data-testid="card">
        Content
      </Card>
    )

    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })
})
