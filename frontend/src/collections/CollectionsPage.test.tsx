import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import { collections, MOCK_NOW } from './collectionsData.ts'
import { CollectionsPage } from './CollectionsPage.tsx'

function renderPage(list: typeof collections) {
  return render(
    <ThemeProvider>
      <CollectionsPage collections={list} now={MOCK_NOW} />
    </ThemeProvider>,
  )
}

describe('CollectionsPage', () => {
  test('renders the nav, header, and one card per collection, grouped by term', () => {
    renderPage(collections)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Collections' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Autumn 2026' })).toBeInTheDocument()
    for (const collection of collections) {
      expect(screen.getByRole('link', { name: new RegExp(collection.name) })).toBeInTheDocument()
    }
  })

  test('shows an empty state when there are no collections', () => {
    renderPage([])

    expect(screen.getByText(/No collections yet/)).toBeInTheDocument()
  })
})
