import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Notice } from './Notice.tsx'

describe('Notice', () => {
  test('defaults to an info tone announced as a status', () => {
    render(<Notice>Saved.</Notice>)

    expect(screen.getByRole('status')).toHaveTextContent('Saved.')
  })

  test('an error tone is announced as an alert and shows an optional title', () => {
    render(<Notice tone="error" title="Something went wrong">Try again.</Notice>)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveTextContent('Try again.')
  })

  test.each(['success', 'warning'] as const)('renders the %s tone', (tone) => {
    render(<Notice tone={tone}>Message</Notice>)
    expect(screen.getByRole('status').className).toContain(`notice--${tone}`)
  })
})
