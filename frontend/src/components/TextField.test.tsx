import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { TextField } from './TextField.tsx'

describe('TextField', () => {
  test('shows the hint when there is no error', () => {
    render(<TextField label="Password" name="password" hint="At least 8 characters." />)

    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument()
  })

  test('replaces the hint with the error and marks the input invalid', () => {
    render(<TextField label="Password" name="password" hint="At least 8 characters." error="Too short." />)

    expect(screen.queryByText('At least 8 characters.')).not.toBeInTheDocument()
    expect(screen.getByText('Too short.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
  })

  test('only renders a reveal toggle for password fields with showReveal', () => {
    render(<TextField label="Email" name="email" type="email" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  test('toggles visibility and label when showReveal is set', () => {
    render(<TextField label="Password" name="password" type="password" showReveal />)

    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: /show\s*password/i }))
    expect(input.type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: /hide\s*password/i }))
    expect(input.type).toBe('password')
  })
})
