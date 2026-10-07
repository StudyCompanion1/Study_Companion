import { useId, useState, type FormEvent } from 'react'
import { login, register, type User } from './api.ts'
import './AuthForm.css'

type Mode = 'login' | 'register'

// Functional login / create-account form for DA-2. Visual design belongs to UX (Figma
// "Log in" screens); restyle freely, but keep the native form elements and labels.
export default function AuthForm({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const id = useId()
  const isRegister = mode === 'register'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    setError('')
    setSubmitting(true)
    try {
      const user = isRegister
        ? await register(String(form.get('name')), email, password)
        : await login(email, password)
      onLoggedIn(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-form">
      <h1 className="auth-form__title">{isRegister ? 'Create your account' : 'Log in'}</h1>

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <div className="auth-form__field">
            <label htmlFor={`${id}-name`}>Name</label>
            <input id={`${id}-name`} name="name" autoComplete="name" required maxLength={100} />
          </div>
        )}

        <div className="auth-form__field">
          <label htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required />
        </div>

        <div className="auth-form__field">
          <label htmlFor={`${id}-password`}>Password</label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={isRegister ? 8 : undefined}
            maxLength={128}
            aria-describedby={isRegister ? `${id}-password-hint` : undefined}
          />
          {isRegister && (
            <p id={`${id}-password-hint`} className="auth-form__hint">
              At least 8 characters.
            </p>
          )}
        </div>

        {/* role="alert" makes screen readers announce the error as soon as it appears */}
        <p role="alert" className="auth-form__error">
          {error}
        </p>

        <button type="submit" className="auth-form__submit" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>

      <button
        type="button"
        className="auth-form__switch"
        onClick={() => {
          setMode(isRegister ? 'login' : 'register')
          setError('')
        }}
      >
        {isRegister ? 'Already have an account? Log in' : 'New here? Create an account'}
      </button>
    </main>
  )
}
