import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import App from './App.tsx'

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('App', () => {
  test('returns to login if checking the current session fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Guest login' })).toBeInTheDocument()
  })

  test('opens the collections route after verifying the session', async () => {
    window.history.replaceState({}, '', '/collections')
    vi.stubGlobal('fetch', vi.fn().mockImplementation((path: string) => Promise.resolve(
      new Response(JSON.stringify(path === '/api/auth/me'
        ? { id: '1', name: 'Maya', email: 'maya@example.com' }
        : []), { status: 200 }),
    )))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Collections', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText(/No collections yet/)).toBeInTheDocument()
  })
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
    expect(screen.queryByRole('button', { name: 'Decrease Font Size' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Increase Font Size' })).not.toBeInTheDocument()
  })
})
