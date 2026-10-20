import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { collections, MOCK_NOW } from './collectionsData.ts'
import { CollectionCard } from './CollectionCard.tsx'

describe('CollectionCard', () => {
  test('links to the collection and shows its code, name, term, and note count', () => {
    render(<CollectionCard collection={collections[0]} href="/collections/bio201" now={MOCK_NOW} />)

    const link = screen.getByRole('link', { name: /Cell biology/ })
    expect(link).toHaveAttribute('href', '/collections/bio201')
    expect(screen.getByText('BIO 201')).toBeInTheDocument()
    expect(screen.getByText('Cell biology')).toBeInTheDocument()
    expect(screen.getByText('Autumn 2026')).toBeInTheDocument()
    expect(screen.getByText('12 notes')).toBeInTheDocument()
  })

  test('the accessible name includes when it was last edited', () => {
    render(<CollectionCard collection={collections[0]} href="/collections/bio201" now={MOCK_NOW} />)

    expect(screen.getByRole('link', { name: /Edited 2 h ago/ })).toBeInTheDocument()
  })
})
