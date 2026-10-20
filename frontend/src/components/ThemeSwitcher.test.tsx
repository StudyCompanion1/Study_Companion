import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ThemeSwitcher } from './ThemeSwitcher.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'

describe('ThemeSwitcher', () => {
  test('renders a radio group with one option checked', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    )

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  })

  test('clicking an option switches the checked theme', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('radio', { name: 'High contrast theme' }))

    expect(screen.getByRole('radio', { name: 'High contrast theme' })).toHaveAttribute('aria-checked', 'true')
  })
})
