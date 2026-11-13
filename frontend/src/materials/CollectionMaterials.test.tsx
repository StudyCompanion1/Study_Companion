import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { CollectionsRoute } from '../collections/CollectionsRoute.tsx'
import { MOCK_NOW } from '../collections/collectionsData.ts'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import { filePicker, jsonResponse } from './uploadTestUtils.ts'

/* F1 end to end on one collection's page: CollectionsRoute loads the collection and its
   materials, CollectionHead uploads, MaterialsSection shows the result. */

const collection = {
  id: '8f59800a-6ee4-44e0-86e9-81a22d1978c0', name: 'Cell biology', code: null, term: null,
  updated_at: MOCK_NOW.toISOString(), note_count: 0,
}
const uploaded = (title: string) => ({
  id: title, collection_id: collection.id, title, file_type: 'pdf', created_at: MOCK_NOW.toISOString(),
})

afterEach(() => vi.unstubAllGlobals())

test('shows a collection’s uploaded materials and adds a new upload to them', async () => {
  // Answers each request the page makes, like the backend would
  const fetchMock = vi.fn((url: string) => {
    if (url.startsWith('/api/materials?')) return Promise.resolve(jsonResponse([uploaded('Week 1')]))
    if (url === '/api/materials') return Promise.resolve(jsonResponse(uploaded('Week 2'), 201))
    return Promise.resolve(jsonResponse(collection))
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <ThemeProvider>
      <CollectionsRoute route={{ page: 'one', collectionId: collection.id }} now={MOCK_NOW} />
    </ThemeProvider>,
  )

  expect(await screen.findByText('Week 1')).toBeInTheDocument()
  expect(screen.getByText('1 file · newest first')).toBeInTheDocument()

  fireEvent.change(filePicker(), { target: { files: [new File(['%PDF'], 'Week 2.pdf')] } })

  expect(await screen.findByText('“Week 2.pdf” is saved to this collection.')).toBeInTheDocument()
  expect(screen.getByText('2 files · newest first')).toBeInTheDocument()
  expect(screen.getAllByText(/^Week \d$/).map((el) => el.textContent)).toEqual(['Week 2', 'Week 1'])
  expect(fetchMock).toHaveBeenCalledWith(`/api/materials?collection_id=${collection.id}`, expect.any(Object))
})
