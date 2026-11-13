import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { PageHeader } from '../components/PageHeader.tsx'
import type { Material } from './api.ts'
import { useMaterialUpload } from './useMaterialUpload.tsx'

const material: Material = { id: '1', collection_id: null, title: 'Week 1', file_type: 'pdf', created_at: '2026-11-12T00:00:00Z' }

function Harness({ collectionId, onUploaded }: { collectionId?: string; onUploaded?: (m: Material) => void }) {
  const upload = useMaterialUpload({ collectionId, onUploaded })
  return (
    <>
      <PageHeader title="Home" summary="" actionLabel={upload.label} onAction={upload.open} actionDisabled={upload.busy} />
      {upload.element}
    </>
  )
}

function choose(file: File | null) {
  const input = screen.getByLabelText('Choose course material to upload')
  fireEvent.change(input, { target: { files: file ? [file] : [] } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMaterialUpload', () => {
  test('the button opens the file picker', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Choose course material to upload') as HTMLInputElement
    const click = vi.spyOn(input, 'click')

    fireEvent.click(screen.getByRole('button', { name: 'Upload material' }))

    expect(click).toHaveBeenCalledTimes(1)
    expect(input.accept).toContain('.pdf')
  })

  test('uploads the chosen file, shows progress, then success', async () => {
    let finish: (res: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))))
    const onUploaded = vi.fn()
    render(<Harness onUploaded={onUploaded} />)

    choose(new File(['%PDF'], 'Week 1.pdf'))

    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled()
    expect(screen.getByText('Uploading “Week 1.pdf”…')).toBeInTheDocument()

    await act(async () => finish(new Response(JSON.stringify(material), { status: 201 })))

    expect(screen.getByText('“Week 1.pdf” is saved to your account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload material' })).toBeEnabled()
    expect(onUploaded).toHaveBeenCalledWith(material)
  })

  test('uploads into the collection when given one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(material), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<Harness collectionId="c1" />)

    await act(async () => choose(new File(['%PDF'], 'a.pdf')))

    expect((fetchMock.mock.calls[0][1].body as FormData).get('collection_id')).toBe('c1')
    expect(screen.getByText('“a.pdf” is saved to this collection.')).toBeInTheDocument()
  })

  test('rejects an unsupported file without calling the backend', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<Harness />)

    choose(new File(['MZ'], 'setup.exe'))

    expect(screen.getByRole('alert')).toHaveTextContent(/isn’t supported/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('shows the backend error when the upload fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'You are not logged in.' }), { status: 401 })),
    )
    render(<Harness />)

    await act(async () => choose(new File(['%PDF'], 'a.pdf')))

    expect(screen.getByRole('alert')).toHaveTextContent('You are not logged in.')
  })

  test('shows a generic error when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'))
    render(<Harness />)

    await act(async () => choose(new File(['%PDF'], 'a.pdf')))

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  test('does nothing when the picker is closed without choosing a file', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<Harness />)

    choose(null)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
