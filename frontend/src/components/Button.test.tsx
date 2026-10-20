import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Button } from './Button.tsx'

describe('Button', () => {
  test('renders as a button with the default type/variant and calls onClick', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('button--secondary')

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('renders an icon, respects explicit type/variant/size, and stretches full width', () => {
    render(
      <Button type="submit" variant="primary" size="sm" icon="check" fullWidth>
        Submit
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button.className).toContain('button--primary')
    expect(button.className).toContain('button--sm')
    expect(button.className).toContain('button--full')
    expect(button.querySelector('svg')).toBeInTheDocument()
  })
})
