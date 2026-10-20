import { render, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import { collections, notes, MOCK_NOW } from './collectionsData.ts'
import { CollectionPage } from './CollectionPage.tsx'

function renderPage(collection: (typeof collections)[number] | undefined, noteList: typeof notes) {
  return render(
    <ThemeProvider>
      <CollectionPage collection={collection} notes={noteList} now={MOCK_NOW} />
    </ThemeProvider>,
  )
}

describe('CollectionPage', () => {
  test('renders the breadcrumb, header, and notes most-recently-opened first', () => {
    renderPage(collections[0], notes)

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByRole('link', { name: 'Collections' })).toHaveAttribute('href', '/collections')
    expect(screen.getByRole('heading', { name: 'Cell biology' })).toBeInTheDocument()
    expect(screen.getByText('BIO 201 · Autumn 2026 · 12 notes')).toBeInTheDocument()

    const titles = screen.getAllByText(/^(Cell structure|Mitochondria and ATP)$/)
    expect(titles[0]).toHaveTextContent('Cell structure')
  })

  test('shows an empty-notes message when the collection has no notes', () => {
    renderPage(collections[0], [])

    expect(screen.getByText(/No notes yet/)).toBeInTheDocument()
  })

  test('shows a not-found message when the collection does not exist', () => {
    renderPage(undefined, [])

    expect(screen.getByRole('heading', { name: /couldn’t find that collection/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Collections' })).toHaveAttribute('href', '/collections')
  })
})
