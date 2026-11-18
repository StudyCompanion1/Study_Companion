import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NavRail } from './NavRail.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'

describe('NavRail', () => {
  test('marks the active item with aria-current, defaulting to Home', () => {
    render(<NavRail />)

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Collections' })).not.toHaveAttribute('aria-current')
  })

  test('marks a different item active when told to', () => {
    render(<NavRail active="Practice" />)

    expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  test('does not include a Quizzes link', () => {
    render(<NavRail />)

    expect(screen.queryByRole('link', { name: 'Quizzes' })).not.toBeInTheDocument()
  })

    test('always includes a Settings button', () => {
    render(<NavRail />)

      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  test('shows Accessibility above Settings and opens its own panel', () => {
    render(<ThemeProvider><NavRail /></ThemeProvider>)

    const accessibility = screen.getByRole('button', { name: 'Accessibility' })
    const settings = screen.getByRole('button', { name: 'Settings' })
    expect(accessibility.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(accessibility)
    expect(screen.getByRole('heading', { name: 'Accessibility' })).toBeInTheDocument()
    expect(screen.getByLabelText('Text size')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  test('keeps only appearance and log out in Settings', () => {
    render(<ThemeProvider><NavRail /></ThemeProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Text size')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Color blind mode' })).not.toBeInTheDocument()
  })

  test('shows Buddy beneath Search with an AI graphic', () => {
    render(<NavRail />)

    expect(screen.getByRole('link', { name: 'Buddy' })).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  test('shows an Upload button with the upload icon', () => {
    render(<NavRail />)

    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  })

  test('shows Groups above the Upload button', () => {
    render(<NavRail />)

    const groups = screen.getByRole('link', { name: 'Groups' })
    const upload = screen.getByRole('button', { name: 'Upload' })

    expect(groups).toBeInTheDocument()
    expect(groups.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('applies the text size slider value to the page font size', () => {
    render(
      <ThemeProvider>
        <NavRail />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Accessibility' }))

    const textSize = screen.getByLabelText('Text size')
    expect(textSize).toHaveAttribute('min', '0.75')
    expect(textSize).toHaveAttribute('max', '2')
    fireEvent.change(textSize, { target: { value: '1.25' } })

    expect(document.documentElement.style.fontSize).toBe('20px')
  })
})
