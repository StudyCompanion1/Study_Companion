import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import { MOCK_NOW } from './collectionsData.ts'
import { CollectionsRoute } from './CollectionsRoute.tsx'

const savedCollection = {
  id: '8f59800a-6ee4-44e0-86e9-81a22d1978c0',
  name: 'Cell biology',
  code: null,
  term: null,
  updated_at: MOCK_NOW.toISOString(),
  note_count: 0,
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function renderRoute(route: Parameters<typeof CollectionsRoute>[0]['route']) {
  return render(
    <ThemeProvider>
      <CollectionsRoute route={route} now={MOCK_NOW} />
    </ThemeProvider>,
  )
}

async function openCreateDialog() {
  const button = await screen.findByRole('button', { name: 'New collection' })
  const dialog = screen.getByRole<HTMLDialogElement>('dialog', { hidden: true })
  // jsdom does not implement these dialog methods.
  dialog.showModal = () => { dialog.open = true }
  dialog.close = () => {
    dialog.open = false
    fireEvent(dialog, new Event('close'))
  }
  fireEvent.click(button)
  return within(dialog)
}

afterEach(() => vi.unstubAllGlobals())

describe('CollectionsRoute', () => {
  test('loads the saved Collections list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([savedCollection]))
    vi.stubGlobal('fetch', fetchMock)
    renderRoute({ page: 'all' })

    expect(screen.getByRole('heading', { name: 'Collections' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Cell biology, 0 notes/ })).toHaveAttribute(
      'href', `/collections/${savedCollection.id}`,
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/collections', expect.any(Object))
  })

  test('creates a named empty collection and adds the saved card', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json(savedCollection, 201))
    vi.stubGlobal('fetch', fetchMock)
    renderRoute({ page: 'all' })

    const dialog = await openCreateDialog()
    fireEvent.change(dialog.getByRole('textbox', { name: 'Collection name' }), { target: { value: '  Cell biology  ' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Create collection' }))

    expect(await screen.findByRole('link', { name: /Cell biology, 0 notes/ })).toHaveAttribute(
      'href', `/collections/${savedCollection.id}`,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/collections', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Cell biology' }),
    }))
  })

  test('validates the name and preserves the draft when saving fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({}, 500))
    vi.stubGlobal('fetch', fetchMock)
    renderRoute({ page: 'all' })

    const dialog = await openCreateDialog()
    const name = dialog.getByRole('textbox', { name: 'Collection name' })
    const create = dialog.getByRole('button', { name: 'Create collection' })
    fireEvent.change(name, { target: { value: '   ' } })
    fireEvent.click(create)
    expect(dialog.getByText('Enter a collection name.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.change(name, { target: { value: 'Cell biology' } })
    fireEvent.click(create)

    expect(await dialog.findByRole('alert')).toHaveTextContent('Couldn’t create the collection')
    expect(name).toHaveValue('Cell biology')
    expect(create).toBeEnabled()
    expect(screen.queryByRole('link', { name: /Cell biology/ })).not.toBeInTheDocument()
  })

  test('opening a saved collection shows that it has no notes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(savedCollection))
    vi.stubGlobal('fetch', fetchMock)
    renderRoute({ page: 'one', collectionId: savedCollection.id })

    expect(await screen.findByRole('heading', { name: 'Cell biology' })).toBeInTheDocument()
    expect(screen.getByText(/No notes yet/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`/api/collections/${savedCollection.id}`, expect.any(Object))
  })

  test('an unknown id renders the not-found state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 404)))
    renderRoute({ page: 'one', collectionId: 'nope' })

    expect(await screen.findByRole('heading', { name: /couldn’t find that collection/ })).toBeInTheDocument()
  })

  test('a list request failure is shown as an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)))
    renderRoute({ page: 'all' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load your collections')
    expect(screen.queryByText(/No collections yet/)).not.toBeInTheDocument()
  })
})
