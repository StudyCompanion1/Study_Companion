import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { SearchPage } from './SearchPage.tsx'

function stubSearchResponse(rawText: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(rawText), { status: 200 })))
}

describe('SearchPage', () => {
  test('searching a topic lists the resources found', async () => {
    stubSearchResponse('The Krebs cycle — overview\nhttps://www.khanacademy.org/krebs\n\nKrebs video\nhttps://youtube.com/watch?v=1')
    render(<SearchPage />)

    fireEvent.change(screen.getByLabelText('Study topic'), { target: { value: 'the Krebs cycle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await screen.findByRole('heading', { name: 'Results for “the Krebs cycle”' })
    expect(screen.getByText('The Krebs cycle — overview')).toBeInTheDocument()
    expect(screen.getByText('khanacademy.org')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open' })).toHaveLength(2)
  })

  test('shows a notice when nothing is found', async () => {
    stubSearchResponse('')
    render(<SearchPage />)

    fireEvent.change(screen.getByLabelText('Study topic'), { target: { value: 'the history of teletubbies' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await screen.findByText('No materials found')
    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument()
  })
})
