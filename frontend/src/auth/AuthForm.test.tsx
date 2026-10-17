import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import AuthForm from './AuthForm.tsx'

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function fillAndSubmit({ name, email, password }: { name?: string; email: string; password: string }) {
  if (name !== undefined) fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: name !== undefined ? 'Create account' : 'Log in' }))
}

describe('AuthForm', () => {
  test('logs in and reports the user', async () => {
    mockFetch(200, { id: '1', name: 'Maya', email: 'maya@example.com' })
    const onLoggedIn = vi.fn()
    render(<AuthForm onLoggedIn={onLoggedIn} />)

    fillAndSubmit({ email: 'maya@example.com', password: 'secret-password' })

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith({ id: '1', name: 'Maya', email: 'maya@example.com' }))
  })

  test('shows the backend error and stays usable', async () => {
    mockFetch(401, { detail: 'Incorrect email or password.' })
    render(<AuthForm onLoggedIn={vi.fn()} />)

    fillAndSubmit({ email: 'maya@example.com', password: 'wrong-password' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(screen.getByRole('button', { name: 'Log in' })).not.toBeDisabled()
  })

  test('switching to register mode adds the name field and calls register()', async () => {
    mockFetch(201, { id: '2', name: 'Sam', email: 'sam@example.com' })
    const onLoggedIn = vi.fn()
    render(<AuthForm onLoggedIn={onLoggedIn} />)

    fireEvent.click(screen.getByRole('button', { name: /create an account/i }))
    expect(screen.getByLabelText('Name')).toBeInTheDocument()

    fillAndSubmit({ name: 'Sam', email: 'sam@example.com', password: 'secret-password' })

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled())
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/register')

    fireEvent.click(screen.getByRole('button', { name: /already have an account/i }))
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})
