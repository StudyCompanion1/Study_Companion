// Calls to the backend auth API (backend/app/auth/router.py). The login cookie is
// HttpOnly, so this code never sees the token; the browser sends it automatically.

export type User = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin' | 'instructor'
  created_at: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type ValidationIssue = { loc: (string | number)[]; msg: string }

const FIELD_MESSAGES: Record<string, string> = {
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  password: 'Password must be between 8 and 128 characters.',
}

/** Turn a FastAPI error body into one sentence a user can act on. */
export function errorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const fields = (detail as ValidationIssue[]).map((issue) => String(issue.loc.at(-1)))
    const messages = [...new Set(fields)].map((field) => FIELD_MESSAGES[field]).filter(Boolean)
    if (messages.length > 0) return messages.join(' ')
  }
  return 'Something went wrong. Please try again.'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new ApiError(res.status, errorMessage(await res.json().catch(() => null)))
  return (res.status === 204 ? undefined : await res.json()) as T
}

/** The logged-in user, or null if nobody is logged in. */
export async function getMe(): Promise<User | null> {
  try {
    return await request<User>('/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function login(email: string, password: string): Promise<User> {
  return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function register(name: string, email: string, password: string): Promise<User> {
  return request('/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
}

export function logout(): Promise<void> {
  return request('/logout', { method: 'POST' })
}
