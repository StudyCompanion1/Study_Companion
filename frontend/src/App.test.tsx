import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import App from './App.tsx'

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  test('shows a loading status before the backend responds', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  test('shows the login form when nobody is logged in', async () => {
    mockFetch(401, { detail: 'You are not logged in.' })
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  test('shows the home page once logged in', async () => {
    mockFetch(200, { id: '1', name: 'Maya', email: 'maya@example.com' })
    render(<App />)

    expect(await screen.findByText('Good afternoon, Maya')).toBeInTheDocument()
  })
})
