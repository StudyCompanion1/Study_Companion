import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { UploadHarness } from './UploadHarness.tsx'
import { choose, jsonResponse } from './uploadTestUtils.ts'

afterEach(() => vi.unstubAllGlobals())

describe('useMaterialUpload — when it can’t upload', () => {
  test('rejects an unsupported file without calling the backend', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<UploadHarness />)

    choose(new File(['MZ'], 'setup.exe'))

    expect(screen.getByRole('alert')).toHaveTextContent(/isn’t supported/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('shows the backend error when the upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ detail: 'You are not logged in.' }, 401)))
    render(<UploadHarness collectionId="c1" />)

    await act(async () => choose(new File(['%PDF'], 'a.pdf')))

    expect(screen.getByRole('alert')).toHaveTextContent('You are not logged in.')
  })

  test('shows a generic error when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('offline'))
    render(<UploadHarness collectionId="c1" />)

    await act(async () => choose(new File(['%PDF'], 'a.pdf')))

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  test('does nothing when the picker is closed without choosing a file', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<UploadHarness />)

    choose(null)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
