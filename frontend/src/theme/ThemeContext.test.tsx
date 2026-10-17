import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext.tsx'

function Consumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('high-contrast')}>Go high contrast</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ThemeProvider', () => {
  test('falls back to the OS preference when nothing is stored', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }) as MediaQueryList)

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  test('uses the theme already stored in localStorage', () => {
    localStorage.setItem('theme', 'high-contrast')

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme')).toHaveTextContent('high-contrast')
  })

  test('setTheme updates the document attribute and persists the choice', () => {
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Go high contrast' }))

    expect(screen.getByTestId('theme')).toHaveTextContent('high-contrast')
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast')
    expect(localStorage.getItem('theme')).toBe('high-contrast')
  })
})

test('useTheme throws when used outside a ThemeProvider', () => {
  expect(() => render(<Consumer />)).toThrow('useTheme must be used within a ThemeProvider')
})
