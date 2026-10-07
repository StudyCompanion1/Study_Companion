import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiError, errorMessage, getMe, login } from './api.ts'

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('errorMessage', () => {
  test('passes through the backend message', () => {
    expect(errorMessage({ detail: 'Incorrect email or password.' })).toBe('Incorrect email or password.')
  })

  test('turns validation errors into one message per field', () => {
    const body = {
      detail: [
        { loc: ['body', 'email'], msg: 'value is not a valid email address' },
        { loc: ['body', 'password'], msg: 'String should have at least 8 characters' },
        { loc: ['body', 'password'], msg: 'another password problem' },
      ],
    }
    expect(errorMessage(body)).toBe(
      'Enter a valid email address. Password must be between 8 and 128 characters.',
    )
  })

  test('falls back to a generic message', () => {
    expect(errorMessage(null)).toBe('Something went wrong. Please try again.')
    expect(errorMessage({ detail: [{ loc: ['body', 'unknown'], msg: 'x' }] })).toBe(
      'Something went wrong. Please try again.',
    )
  })
})

describe('getMe', () => {
  test('returns null when nobody is logged in', async () => {
    mockFetch(401, { detail: 'You are not logged in.' })
    expect(await getMe()).toBeNull()
  })

  test('returns the logged-in user', async () => {
    mockFetch(200, { id: '1', name: 'Maya', email: 'maya@example.com' })
    expect(await getMe()).toMatchObject({ name: 'Maya' })
  })

  test('throws on server errors instead of pretending nobody is logged in', async () => {
    mockFetch(500, { detail: 'boom' })
    await expect(getMe()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('login', () => {
  test('posts JSON to the login endpoint', async () => {
    const fetchMock = mockFetch(200, { id: '1' })
    await login('maya@example.com', 'secret-password')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/login')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ email: 'maya@example.com', password: 'secret-password' })
  })

  test('rejects with the backend message on bad credentials', async () => {
    mockFetch(401, { detail: 'Incorrect email or password.' })
    await expect(login('maya@example.com', 'wrong')).rejects.toThrow('Incorrect email or password.')
  })
})
