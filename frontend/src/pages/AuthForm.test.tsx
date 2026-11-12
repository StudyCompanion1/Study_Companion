import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import AuthForm from './AuthForm.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

function renderForm(props: Parameters<typeof AuthForm>[0]) {
  return render(
    <ThemeProvider>
      <AuthForm {...props} />
    </ThemeProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function fillAndSubmit({ name, email, password, submitLabel }: { name?: string; email: string; password: string; submitLabel: string }) {
  if (name !== undefined) fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: submitLabel }))
}

describe('AuthForm (login)', () => {
  test('renders only email and password fields', () => {
    renderForm({ onLoggedIn: vi.fn() })

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  test('blocks submission with empty fields and focuses the first invalid one', () => {
    renderForm({ onLoggedIn: vi.fn() })

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveFocus()
  })

  test('rejects a malformed email before calling the backend', () => {
    const fetchMock = mockFetch(200, {})
    vi.stubGlobal('fetch', fetchMock)
    renderForm({ onLoggedIn: vi.fn() })

    fillAndSubmit({ email: 'not-an-email', password: 'secret-password', submitLabel: 'Login' })

    expect(screen.getByText('That email address looks incomplete. Check it and try again.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('logs in and reports the user', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { id: '1', name: 'Maya', email: 'maya@example.com' }))
    const onLoggedIn = vi.fn()
    renderForm({ onLoggedIn })

    fillAndSubmit({ email: 'maya@example.com', password: 'secret-password', submitLabel: 'Login' })

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith({ id: '1', name: 'Maya', email: 'maya@example.com' }))
  })

  test('shows a generic error on bad credentials, without revealing which field was wrong', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { detail: 'Incorrect email or password.' }))
    renderForm({ onLoggedIn: vi.fn() })

    fillAndSubmit({ email: 'maya@example.com', password: 'wrong-password', submitLabel: 'Login' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t log you in. Check your email and password and try again.',
    )
    expect(screen.getByRole('button', { name: 'Login' })).not.toBeDisabled()
  })

  test('shows a connectivity error when the network is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderForm({ onLoggedIn: vi.fn() })

    fillAndSubmit({ email: 'maya@example.com', password: 'secret-password', submitLabel: 'Login' })

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t reach the server')
  })
})

describe('AuthForm (register)', () => {
  test('switching to register mode adds the name field and changes the submit label', () => {
    renderForm({ onLoggedIn: vi.fn() })

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  test('requires a name and a long enough password', () => {
    renderForm({ mode: 'register', onLoggedIn: vi.fn() })

    fillAndSubmit({ name: '', email: 'sam@example.com', password: 'short', submitLabel: 'Sign up' })

    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters for your password.')).toBeInTheDocument()
  })

  test('registers and reports the user', async () => {
    const fetchMock = mockFetch(201, { id: '2', name: 'Sam', email: 'sam@example.com' })
    vi.stubGlobal('fetch', fetchMock)
    const onLoggedIn = vi.fn()
    renderForm({ mode: 'register', onLoggedIn })

    fillAndSubmit({ name: 'Sam', email: 'sam@example.com', password: 'secret-password', submitLabel: 'Sign up' })

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/register')
  })

  test('shows the backend message when registration fails', async () => {
    vi.stubGlobal('fetch', mockFetch(409, { detail: 'An account with this email already exists.' }))
    renderForm({ mode: 'register', onLoggedIn: vi.fn() })

    fillAndSubmit({ name: 'Sam', email: 'sam@example.com', password: 'secret-password', submitLabel: 'Sign up' })

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })

  test('toggling back to login clears the name field and its errors', () => {
    renderForm({ mode: 'register', onLoggedIn: vi.fn() })

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})

describe('AuthForm password reveal', () => {
  test('toggles the password field between hidden and visible', () => {
    renderForm({ onLoggedIn: vi.fn() })

    const reveal = screen.getByRole('button', { name: /show\s*password/i })
    const password = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(password.type).toBe('password')

    fireEvent.click(reveal)

    expect(password.type).toBe('text')
    expect(screen.getByRole('button', { name: /hide\s*password/i })).toBeInTheDocument()
  })
})
