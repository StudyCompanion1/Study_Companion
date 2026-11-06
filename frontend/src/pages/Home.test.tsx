import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Home } from './Home.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'

function renderHome() {
  return render(
    <ThemeProvider>
      <Home />
    </ThemeProvider>,
  )
}

describe('Home', () => {
  test('renders nav, header, and all three sections', () => {
    renderHome()

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Good afternoon, Maya' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pick up where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Needs more practice' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent quizzes' })).toBeInTheDocument()
  })

  test('renders a resumable session, a practice topic, and a quiz result', () => {
    renderHome()

    expect(screen.getByRole('link', { name: /Cell structure/ })).toBeInTheDocument()
    expect(screen.getByText('Mitochondria and ATP')).toBeInTheDocument()
    expect(screen.getByText('Cell organelles')).toBeInTheDocument()
  })
})
