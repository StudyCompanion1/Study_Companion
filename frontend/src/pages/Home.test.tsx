import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Home } from './Home.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import type { User } from '../auth/api.ts'

const mockUser: User = {
  id: 'u1',
  name: 'Maya',
  email: 'maya@example.com',
  role: 'student',
  created_at: new Date().toISOString(),
}

const mockCollections = [
  { id: '1', name: 'Cell biology', code: 'BIO 201', term: null, updated_at: new Date().toISOString(), note_count: 2 },
]

function renderHome(collections = mockCollections) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(collections), { status: 200 })))
  return render(
    <ThemeProvider>
      <Home user={mockUser} />
    </ThemeProvider>,
  )
}

describe('Home', () => {
  test('renders nav, header, and all three sections', async () => {
    renderHome()

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Good afternoon, Maya' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pick up where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Needs more practice' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent quizzes' })).toBeInTheDocument()
    await screen.findByRole('link', { name: /Cell biology/ })
  })

  test('renders the 3 most recently updated collections, a practice topic, and a quiz result', async () => {
    renderHome()

    expect(await screen.findByRole('link', { name: /Cell biology/ })).toBeInTheDocument()
    expect(screen.getByText('Mitochondria and ATP')).toBeInTheDocument()
    expect(screen.getByText('Cell organelles')).toBeInTheDocument()
  })

  test('shows an empty state when the user has no collections yet', async () => {
    renderHome([])

    expect(await screen.findByText('No collections yet. Create one to get started.')).toBeInTheDocument()
  })
})
