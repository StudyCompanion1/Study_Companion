import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import { MOCK_NOW } from './collectionsData.ts'
import { CollectionsRoute } from './CollectionsRoute.tsx'

function renderRoute(route: Parameters<typeof CollectionsRoute>[0]['route']) {
  return render(
    <ThemeProvider>
      <CollectionsRoute route={route} now={MOCK_NOW} />
    </ThemeProvider>,
  )
}

describe('CollectionsRoute', () => {
  test('"all" renders the Collections list', () => {
    renderRoute({ page: 'all' })

    expect(screen.getByRole('heading', { name: 'Collections' })).toBeInTheDocument()
  })

  test('"one" with a real id renders that collection', () => {
    renderRoute({ page: 'one', collectionId: 'bio201' })

    expect(screen.getByRole('heading', { name: 'Cell biology' })).toBeInTheDocument()
  })

  test('"one" with an unknown id renders the not-found state', () => {
    renderRoute({ page: 'one', collectionId: 'nope' })

    expect(screen.getByRole('heading', { name: /couldn’t find that collection/ })).toBeInTheDocument()
  })
})
