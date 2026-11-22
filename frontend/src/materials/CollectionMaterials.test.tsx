import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { CollectionsRoute } from '../collections/CollectionsRoute.tsx'
import { MOCK_NOW } from '../collections/collectionsData.ts'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import type { Material } from './api.ts'
import { filePicker, jsonResponse } from './uploadTestUtils.ts'

/* One collection's page end to end: CollectionsRoute loads the collection and its files,
   each file is a row of Notes that opens the material view, new uploads go on top, and the
   student can search and reorder (NotesSection.tsx). */

const collection = {
  id: '8f59800a-6ee4-44e0-86e9-81a22d1978c0', name: 'Cell biology', code: null, term: null,
  updated_at: MOCK_NOW.toISOString(), note_count: 3,
}

function file(id: string, title: string, extra: Partial<Material> = {}): Material {
  return {
    id, collection_id: collection.id, title, file_name: `${title}.pdf`, file_type: 'pdf', position: 0,
    page_count: 12, last_opened_at: null, created_at: MOCK_NOW.toISOString(), ...extra,
  }
}

const saved = [
  file('a', 'Week 1', { last_opened_at: new Date(MOCK_NOW.getTime() - 2 * 3600_000).toISOString() }),
  file('b', 'Week 2', { file_name: 'Week 2.pptx', file_type: 'ppt', page_count: 18 }),
  file('c', 'Reading list', { file_name: 'Reading list.txt', file_type: 'txt', page_count: null }),
]

/** Answers each request the page makes, like the backend would. */
function backend({ order = () => new Response(null, { status: 204 }), list = saved } = {} as {
  order?: () => Response
  list?: Material[]
}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/materials?')) return Promise.resolve(jsonResponse(list))
    if (url === '/api/materials/order') return Promise.resolve(order())
    if (url === '/api/materials') return Promise.resolve(jsonResponse(file('d', 'Week 3'), 201))
    return Promise.resolve(jsonResponse(collection, init?.method ? 405 : 200))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  render(
    <ThemeProvider>
      <CollectionsRoute route={{ page: 'one', collectionId: collection.id }} now={MOCK_NOW} />
    </ThemeProvider>,
  )
}

const titles = () => screen.getAllByRole('link', { name: /^(Week \d|Reading list)$/ }).map((link) => link.textContent)
const orderSent = (fetchMock: ReturnType<typeof backend>) =>
  fetchMock.mock.calls.filter(([url]) => url === '/api/materials/order').map(([, init]) => JSON.parse(String(init!.body)))

afterEach(() => vi.unstubAllGlobals())

test('each uploaded file is a row that opens it, with its length and when it was opened', async () => {
  backend()
  renderPage()

  const week1 = await screen.findByRole('link', { name: 'Week 1' })
  expect(week1).toHaveAttribute('href', `/collections/${collection.id}/materials/a`)
  const row = week1.closest('li')!
  expect(within(row).getByText('12 pages')).toBeInTheDocument()
  expect(within(row).getByText('2 h ago')).toBeInTheDocument()
  expect(within(row).getByText('No quiz yet')).toBeInTheDocument()

  const week2 = screen.getByRole('link', { name: 'Week 2' }).closest('li')!
  expect(within(week2).getByText('18 slides')).toBeInTheDocument()
  expect(within(week2).getByText('Not opened yet')).toBeInTheDocument()
  expect(within(screen.getByRole('link', { name: 'Reading list' }).closest('li')!).getByText('No page count')).toBeInTheDocument()
  expect(screen.getByText('3 notes · your order')).toBeInTheDocument()
})

test('a new upload goes to the top of the list', async () => {
  backend()
  renderPage()
  await screen.findByRole('link', { name: 'Week 1' })

  fireEvent.change(filePicker(), { target: { files: [new File(['%PDF'], 'Week 3.pdf')] } })

  expect(await screen.findByText('“Week 3.pdf” is saved to this collection.')).toBeInTheDocument()
  expect(titles()).toEqual(['Week 3', 'Week 1', 'Week 2', 'Reading list'])
})

test('the arrow buttons reorder, save the order, and keep focus on the moved row', async () => {
  const fetchMock = backend()
  renderPage()
  await screen.findByRole('link', { name: 'Week 1' })
  expect(screen.getByRole('button', { name: 'Move Week 1 up' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Move Reading list down' })).toBeDisabled()

  const down = screen.getByRole('button', { name: 'Move Week 1 down' })
  down.focus()
  await act(async () => fireEvent.click(down))

  expect(titles()).toEqual(['Week 2', 'Week 1', 'Reading list'])
  expect(screen.getByText('Week 1 moved to position 2 of 3.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move Week 1 down' })).toHaveFocus()
  expect(orderSent(fetchMock)).toEqual([{ collection_id: collection.id, material_ids: ['b', 'a', 'c'] }])

  // At the bottom the down button is disabled, so focus moves to the up button
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Move Week 1 down' })))
  expect(screen.getByRole('button', { name: 'Move Week 1 up' })).toHaveFocus()
})

test('rows can be dragged into a new order by their handle', async () => {
  const fetchMock = backend()
  const { container } = render(
    <ThemeProvider>
      <CollectionsRoute route={{ page: 'one', collectionId: collection.id }} now={MOCK_NOW} />
    </ThemeProvider>,
  )
  await screen.findByRole('link', { name: 'Week 1' })
  const grips = container.querySelectorAll('.note-row__grip')
  const firstRow = screen.getByRole('link', { name: 'Week 1' }).closest('li')!

  fireEvent.dragStart(grips[2]) // "Reading list"
  fireEvent.dragOver(firstRow)
  expect(firstRow).toHaveClass('is-drop-target')
  await act(async () => fireEvent.drop(firstRow))

  expect(titles()).toEqual(['Reading list', 'Week 1', 'Week 2'])
  expect(orderSent(fetchMock)[0].material_ids).toEqual(['c', 'a', 'b'])
  expect(firstRow).not.toHaveClass('is-drop-target')

  // Dropping a row on itself, or dragging nothing, changes nothing
  fireEvent.dragStart(grips[0])
  fireEvent.dragEnd(grips[0])
  fireEvent.dragOver(firstRow)
  fireEvent.drop(firstRow)
  expect(orderSent(fetchMock)).toHaveLength(1)
})

test('search filters the rows and pauses reordering', async () => {
  backend()
  renderPage()
  await screen.findByRole('link', { name: 'Week 1' })
  const search = screen.getByRole('searchbox', { name: 'Search this collection' })

  fireEvent.change(search, { target: { value: 'WEEK' } })
  expect(titles()).toEqual(['Week 1', 'Week 2'])
  expect(screen.getByText('2 of 3 notes match.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument()

  fireEvent.change(search, { target: { value: '.pptx' } }) // file names count too
  expect(titles()).toEqual(['Week 2'])

  fireEvent.change(search, { target: { value: 'chemistry' } })
  expect(screen.getByText('No notes match “chemistry”.')).toBeInTheDocument()
})

test('when the new order can’t be saved, the list goes back to what is saved', async () => {
  backend({ order: () => jsonResponse({ detail: 'Out of date' }, 409) })
  renderPage()
  await screen.findByRole('link', { name: 'Week 1' })

  fireEvent.click(screen.getByRole('button', { name: 'Move Week 1 down' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t save the new order')
  await waitFor(() => expect(titles()).toEqual(['Week 1', 'Week 2', 'Reading list']))
})

test('a collection with one file has nothing to reorder', async () => {
  backend({ list: [saved[0]] })
  renderPage()
  await screen.findByRole('link', { name: 'Week 1' })

  expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument()
  expect(screen.getByText('1 note · your order')).toBeInTheDocument()
})
