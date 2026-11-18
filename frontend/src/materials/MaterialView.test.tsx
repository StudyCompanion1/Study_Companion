import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CollectionsRoute } from '../collections/CollectionsRoute.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import type { Material } from './api.ts'
import { jsonResponse } from './uploadTestUtils.ts'
import type { Page } from './viewerApi.ts'

/* The material view end to end (MaterialView.tsx, PageRows.tsx, useNoteSaver.ts): the file on
   the left, a notes box beside each page, notes saved as the student types. */

const collection = { id: 'c1', name: 'Cell biology', code: null, term: null, updated_at: '2026-11-12T00:00:00Z', note_count: 1 }
const pdf: Material = {
  id: 'm1', collection_id: 'c1', title: 'Week 1', file_name: 'Week 1.pdf', file_type: 'pdf', position: 0,
  page_count: 2, last_opened_at: '2026-11-17T00:00:00Z', created_at: '2026-11-12T00:00:00Z',
}
const picture = (number: number): Page => ({ number, text: null, image: true, width: 300, height: 150 })

type Answer = Response | (() => Response) | Promise<Response>

/** A fake backend for one file; pass a Response (or a function) to change an answer. */
function backend({
  material = pdf as Material | Answer,
  notes = [{ page: 2, text: 'ATP is made here', updated_at: '2026-11-12T00:00:00Z' }] as unknown,
  pages = [picture(1), picture(2)] as Page[] | Answer,
  save = (): Response => jsonResponse({ page: 1, text: '', updated_at: '2026-11-17T00:00:00Z' }),
} = {}) {
  const answer = (value: unknown) =>
    Promise.resolve(value instanceof Response ? value : typeof value === 'function' ? value() : jsonResponse(value))
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/open')) return answer(material)
    if (url.endsWith('/pages')) return answer(pages)
    if (url.endsWith('/notes')) return answer(notes)
    if (url.includes('/notes/') && init?.method === 'PUT') return answer(save)
    return answer(collection)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderView() {
  render(
    <ThemeProvider>
      <CollectionsRoute route={{ page: 'material', collectionId: 'c1', materialId: 'm1' }} />
    </ThemeProvider>,
  )
}

const saves = (fetchMock: ReturnType<typeof backend>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PUT')
    .map(([url, init]) => [url, JSON.parse(String(init!.body)).text, init!.keepalive])

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('MaterialView', () => {
  test('shows each page next to its notes box, and marks the file opened', async () => {
    const fetchMock = backend()
    renderView()

    expect(screen.getByText('Loading file…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Week 1' })).toBeInTheDocument()
    expect(screen.getByText('2 pages · In Cell biology')).toBeInTheDocument()
    expect(screen.getByTitle('Week 1.pdf')).toHaveTextContent('PDFWeek 1.pdf')
    expect(screen.getByRole('link', { name: 'Cell biology' })).toHaveAttribute('href', '/collections/c1')
    expect(screen.getByRole('link', { name: 'Back to Cell biology' })).toHaveAttribute('href', '/collections/c1')
    expect(screen.getByText('My notes · 1 note')).toBeInTheDocument()

    const page1 = await screen.findByRole('img', { name: 'Page 1 of Week 1' })
    expect(page1).toHaveAttribute('src', '/api/materials/m1/pages/1/image')
    expect(page1).toHaveAttribute('loading', 'lazy')
    expect(screen.getByRole('textbox', { name: 'Notes for page 1' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Notes for page 2' })).toHaveValue('ATP is made here')
    expect(screen.getByText('Notes save as you type.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/materials/m1/open', expect.objectContaining({ method: 'POST' }))
  })

  test('saves a note shortly after typing stops, and straight away on leaving the box', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = backend()
    renderView()
    const box = await screen.findByRole('textbox', { name: 'Notes for page 1' })

    fireEvent.change(box, { target: { value: 'Cells' } })
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    fireEvent.change(box, { target: { value: 'Cells are small' } })
    await act(async () => vi.advanceTimersByTime(800))

    await waitFor(() => expect(screen.getByText('All notes saved.')).toBeInTheDocument())
    expect(saves(fetchMock)).toEqual([['/api/materials/m1/notes/1', 'Cells are small', true]])

    fireEvent.change(box, { target: { value: 'Cells are small units' } })
    await act(async () => fireEvent.blur(box))
    expect(saves(fetchMock)).toHaveLength(2)
    fireEvent.blur(box) // nothing new to save
    expect(saves(fetchMock)).toHaveLength(2)
  })

  test('a notes box starts small and grows with its notes, up to the height of its page', async () => {
    // jsdom has no layout: each page is 400px tall, the label takes 28px, a line of notes 24px
    const heights = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.className === 'material-view__source' ? 400 : this.className === 'material-view__notes' ? 28 : 0
    })
    const content = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(function (this: Element) {
      return this instanceof HTMLTextAreaElement ? 120 + 24 * this.value.split('\n').length : 0
    })
    backend()
    renderView()
    const box = await screen.findByRole('textbox', { name: 'Notes for page 1' })

    expect(box.style.height).toBe('144px')
    expect(box.style.overflowY).toBe('hidden')

    fireEvent.change(box, { target: { value: 'a\nb\nc' } })
    expect(box.style.height).toBe('192px')

    fireEvent.change(box, { target: { value: 'line\n'.repeat(40) } })
    expect(box.style.height).toBe('372px') // the page's height, less the label
    expect(box.style.overflowY).toBe('auto')

    heights.mockRestore()
    content.mockRestore()
  })

  test('a failed save keeps the note and can be retried', async () => {
    let fail = true
    const fetchMock = backend({
      save: () => (fail ? jsonResponse({}, 500) : jsonResponse({ page: 2, text: 'x', updated_at: '2026-11-17T00:00:00Z' })),
    })
    renderView()
    const box = await screen.findByRole('textbox', { name: 'Notes for page 2' })

    fireEvent.change(box, { target: { value: 'ATP is made in mitochondria' } })
    await act(async () => fireEvent.blur(box))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your notes for page 2 aren’t saved yet.')
    expect(box).toHaveValue('ATP is made in mitochondria')

    fail = false
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })))

    await waitFor(() => expect(screen.getByText('All notes saved.')).toBeInTheDocument())
    expect(saves(fetchMock).map(([, text]) => text)).toEqual(['ATP is made in mitochondria', 'ATP is made in mitochondria'])
  })

  test('leaving the page sends unsaved notes', async () => {
    const fetchMock = backend({ save: () => new Promise<Response>(() => {}) as unknown as Response })
    renderView()
    const box = await screen.findByRole('textbox', { name: 'Notes for page 1' })

    fireEvent.change(box, { target: { value: 'quick note' } })
    const leaving = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(leaving)

    expect(saves(fetchMock)).toEqual([['/api/materials/m1/notes/1', 'quick note', true]])
    await waitFor(() => expect(leaving.defaultPrevented).toBe(true)) // the browser asks before leaving mid-save
  })

  test('slides show their text, one notes box per slide', async () => {
    backend({
      material: { ...pdf, file_type: 'ppt', file_name: 'Cells.pptx' },
      notes: [],
      pages: [{ number: 1, text: 'Cell structure\nNucleus', image: false, width: null, height: null },
        { number: 2, text: '', image: false, width: null, height: null }],
    })
    renderView()

    expect(await screen.findByText(/Cell structure/)).toHaveTextContent('Cell structure Nucleus')
    expect(screen.getByText('Slide 1')).toBeInTheDocument()
    expect(screen.getByText('This slide has no text.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes for slide 2' })).toBeInTheDocument()
  })

  test('a text file is shown whole, and the student adds and removes notes pages', async () => {
    const fetchMock = backend({
      material: { ...pdf, file_type: 'txt', file_name: 'todo.txt', page_count: null },
      notes: [],
      pages: [{ number: 1, text: 'read chapter 2', image: false, width: null, height: null }],
    })
    renderView()

    expect(await screen.findByText('read chapter 2')).toBeInTheDocument()
    expect(screen.getByText('In Cell biology')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes page 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add notes page' }))
    const page2 = screen.getByRole('textbox', { name: 'Notes page 2' })
    expect(page2).toHaveFocus()

    fireEvent.change(page2, { target: { value: 'questions for class' } })
    expect(screen.queryByRole('button', { name: 'Remove notes page 2' })).not.toBeInTheDocument() // it has notes
    await act(async () => fireEvent.blur(page2))
    expect(saves(fetchMock)).toEqual([['/api/materials/m1/notes/2', 'questions for class', true]])

    fireEvent.change(page2, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Remove notes page 2' }))
    expect(screen.queryByRole('textbox', { name: 'Notes page 2' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes page 1' })).toHaveFocus()
  })

  test('a Word file’s notes pages are numbered in order, and stop at 50', async () => {
    backend({
      material: { ...pdf, file_type: 'docx', file_name: 'Lab 2.docx', page_count: 3 },
      notes: [
        { page: 1, text: 'aims', updated_at: '2026-11-12T00:00:00Z' },
        { page: 3, text: 'results', updated_at: '2026-11-12T00:00:00Z' },
      ],
      pages: [{ number: 1, text: '', image: false, width: null, height: null }],
    })
    renderView()

    expect(await screen.findByText('This file has no text.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes page 2' })).toHaveValue('results')
    fireEvent.click(screen.getByRole('button', { name: 'Add notes page' }))
    expect(screen.getByRole('textbox', { name: 'Notes page 3' })).toHaveValue('')

    cleanup()
    backend({
      material: { ...pdf, file_type: 'docx', file_name: 'Lab 2.docx', page_count: 3 },
      notes: [{ page: 50, text: 'full', updated_at: '2026-11-12T00:00:00Z' }],
      pages: [{ number: 1, text: 'Lab 2', image: false, width: null, height: null }],
    })
    renderView()
    expect(await screen.findByRole('textbox', { name: 'Notes page 2' })).toHaveValue('full')
    expect(screen.queryByRole('button', { name: 'Add notes page' })).not.toBeInTheDocument()
  })

  test('an unsaved notes page is named in the error', async () => {
    backend({
      material: { ...pdf, file_type: 'txt', file_name: 'todo.txt', page_count: null },
      notes: [{ page: 2, text: 'b', updated_at: '2026-11-12T00:00:00Z' }],
      pages: [{ number: 1, text: 'read', image: false, width: null, height: null }],
      save: () => jsonResponse({}, 500),
    })
    renderView()
    const box = await screen.findByRole('textbox', { name: 'Notes page 2' })

    fireEvent.change(box, { target: { value: 'bb' } })
    await act(async () => fireEvent.blur(box))

    expect(await screen.findByRole('alert')).toHaveTextContent('Notes page 2 isn’t saved yet.')
  })

  test('an image is shown with its title', async () => {
    backend({
      material: { ...pdf, file_type: 'image', file_name: 'diagram.png', title: 'diagram', page_count: null },
      notes: [],
      pages: [{ number: 1, text: null, image: true, width: 40, height: 30 }],
    })
    renderView()

    expect(await screen.findByRole('img', { name: 'diagram' })).toHaveAttribute('width', '40')
    expect(screen.getByRole('textbox', { name: 'Notes for this file' })).toBeInTheDocument()
  })

  test('a page picture that won’t load says so', async () => {
    backend()
    renderView()

    fireEvent.error(await screen.findByRole('img', { name: 'Page 2 of Week 1' }))

    expect(screen.getByText('Page 2 couldn’t be shown.')).toBeInTheDocument()
  })

  test('a file that can’t be previewed still gets a notes box', async () => {
    backend({ pages: jsonResponse({ detail: 'This file couldn’t be read.' }, 422) })
    renderView()

    expect(await screen.findByText('Preview isn’t available')).toBeInTheDocument()
    expect(screen.getByText('This file couldn’t be read.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes for page 1' })).toBeInTheDocument()
  })

  test('a missing file, or one from another collection, is not found', async () => {
    backend({ material: jsonResponse({ detail: 'File not found.' }, 404) })
    renderView()

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that file' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the collection' })).toHaveAttribute('href', '/collections/c1')
  })

  test('a file from another collection is not found', async () => {
    backend({ material: { ...pdf, collection_id: 'other' } })
    renderView()

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that file' })).toBeInTheDocument()
  })

  test('a server error is shown', async () => {
    backend({ material: jsonResponse({}, 500), pages: () => Promise.reject(new Error('offline')) as unknown as Response })
    renderView()

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load this file.')
  })
})
