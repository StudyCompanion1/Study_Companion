import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { UploadHarness } from './UploadHarness.tsx'
import { choose, jsonResponse, material } from './uploadTestUtils.ts'

/* Uploading from Home: every file goes in a collection, so after picking a file the student
   chooses one of their collections or makes a new one (ChooseCollectionDialog.tsx). */

const biology = { id: 'bio', name: 'Biology', code: 'BIO 201', term: null, updated_at: '2026-11-12T00:00:00Z', note_count: 2 }
const chemistry = { ...biology, id: 'chem', name: 'Chemistry', code: null }

function backend({ collections = [biology, chemistry] as unknown, create = (): Response => jsonResponse({ ...chemistry, id: 'new', name: 'Physics' }, 201) } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === '/api/collections' && init?.method === 'POST') return Promise.resolve(create())
    if (url === '/api/collections') {
      return collections instanceof Response ? Promise.resolve(collections) : Promise.resolve(jsonResponse(collections))
    }
    return Promise.resolve(jsonResponse(material, 201))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const dialog = () => within(screen.getByRole('dialog'))
const uploadedTo = (fetchMock: ReturnType<typeof backend>) =>
  fetchMock.mock.calls
    .filter(([url]) => url === '/api/materials')
    .map(([, init]) => (init!.body as FormData).get('collection_id'))

afterEach(() => vi.unstubAllGlobals())

describe('useMaterialUpload — from Home', () => {
  test('asks which collection, then uploads into it', async () => {
    const fetchMock = backend()
    const onUploaded = vi.fn()
    render(<UploadHarness onUploaded={onUploaded} />)

    choose(new File(['%PDF'], 'Week 1.pdf'))

    expect(await dialog().findByRole('radio', { name: /^Biology.*BIO 201$/ })).toBeChecked()
    expect(dialog().getByText('“Week 1.pdf” will be saved in the collection you pick.')).toBeInTheDocument()
    expect(uploadedTo(fetchMock)).toEqual([]) // nothing is sent before choosing

    fireEvent.click(dialog().getByRole('radio', { name: 'Chemistry' }))
    await act(async () => fireEvent.click(dialog().getByRole('button', { name: 'Upload' })))

    expect(uploadedTo(fetchMock)).toEqual(['chem'])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/“Week 1.pdf” is saved to Chemistry\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Chemistry' })).toHaveAttribute('href', '/collections/chem')
    expect(onUploaded).toHaveBeenCalledWith(material)
  })

  test('makes a new collection for the file', async () => {
    const fetchMock = backend({ collections: [] })
    render(<UploadHarness />)

    choose(new File(['%PDF'], 'Week 1.pdf'))
    expect(await dialog().findByRole('radio', { name: 'New collection' })).toBeChecked()

    fireEvent.click(dialog().getByRole('button', { name: 'Upload' }))
    expect(dialog().getByText('Enter a collection name.')).toBeInTheDocument()

    fireEvent.change(dialog().getByRole('textbox', { name: 'Collection name' }), { target: { value: ' Physics ' } })
    fireEvent.change(dialog().getByRole('textbox', { name: 'Course code (optional)' }), { target: { value: 'PHYS 101' } })
    await act(async () => fireEvent.click(dialog().getByRole('button', { name: 'Upload' })))

    const created = fetchMock.mock.calls.find(([url, init]) => url === '/api/collections' && init?.method === 'POST')
    expect(JSON.parse(String(created![1]!.body))).toEqual({ name: 'Physics', code: 'PHYS 101' })
    expect(uploadedTo(fetchMock)).toEqual(['new'])
    expect(screen.getByText(/is saved to Physics\./)).toBeInTheDocument()
  })

  test('keeps the dialog open when the collection can’t be made', async () => {
    let status = 500
    const fetchMock = backend({ collections: [], create: () => jsonResponse({}, status) })
    render(<UploadHarness />)
    choose(new File(['%PDF'], 'a.pdf'))
    fireEvent.change(await dialog().findByRole('textbox', { name: 'Collection name' }), { target: { value: 'Physics' } })

    await act(async () => fireEvent.click(dialog().getByRole('button', { name: 'Upload' })))
    expect(dialog().getByRole('alert')).toHaveTextContent('Couldn’t create the collection. Please try again.')

    status = 401
    await act(async () => fireEvent.click(dialog().getByRole('button', { name: 'Upload' })))
    expect(dialog().getByRole('alert')).toHaveTextContent('Your session expired.')
    expect(uploadedTo(fetchMock)).toEqual([])
  })

  test('cancelling uploads nothing, and the next file asks again', async () => {
    const fetchMock = backend()
    render(<UploadHarness />)

    choose(new File(['%PDF'], 'a.pdf'))
    fireEvent.click(await dialog().findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    choose(new File(['%PDF'], 'b.pdf'))
    expect(await dialog().findByText('“b.pdf” will be saved in the collection you pick.')).toBeInTheDocument()
    expect(uploadedTo(fetchMock)).toEqual([])
  })

  test('if the collections won’t load, a new one can still be made', async () => {
    backend({ collections: jsonResponse({}, 500) })
    render(<UploadHarness />)

    choose(new File(['%PDF'], 'a.pdf'))

    expect(await dialog().findByText('Couldn’t load your collections, but you can make a new one.')).toBeInTheDocument()
    await waitFor(() => expect(dialog().getByRole('radio', { name: 'New collection' })).toBeChecked())
  })
})
