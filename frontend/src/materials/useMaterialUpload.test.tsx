import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { UploadHarness } from './UploadHarness.tsx'
import { choose, filePicker, jsonResponse, material } from './uploadTestUtils.ts'

afterEach(() => vi.unstubAllGlobals())

describe('useMaterialUpload — happy path', () => {
  test('the button opens the file picker', () => {
    render(<UploadHarness />)
    const click = vi.spyOn(filePicker(), 'click')

    fireEvent.click(screen.getByRole('button', { name: 'Upload material' }))

    expect(click).toHaveBeenCalledTimes(1)
    expect(filePicker().accept).toContain('.pdf')
  })

  test('uploads the chosen file, shows progress, then success', async () => {
    let finish: (res: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => (finish = resolve))))
    const onUploaded = vi.fn()
    render(<UploadHarness onUploaded={onUploaded} />)

    choose(new File(['%PDF'], 'Week 1.pdf'))

    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled()
    expect(screen.getByText('Uploading “Week 1.pdf”…')).toBeInTheDocument()

    await act(async () => finish(jsonResponse(material, 201)))

    expect(screen.getByText('“Week 1.pdf” is saved to your account.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload material' })).toBeEnabled()
    expect(onUploaded).toHaveBeenCalledWith(material)
  })

  test('uploads into the collection when given one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(material, 201))
    vi.stubGlobal('fetch', fetchMock)
    render(<UploadHarness collectionId="c1" />)

    await act(async () => choose(new File(['%PDF'], 'a.pdf')))

    expect((fetchMock.mock.calls[0][1].body as FormData).get('collection_id')).toBe('c1')
    expect(screen.getByText('“a.pdf” is saved to this collection.')).toBeInTheDocument()
  })
})
