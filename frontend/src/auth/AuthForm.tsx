import { useId, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { login, register, type User } from './api.ts'
import { ThemeSwitcher } from '../components/ThemeSwitcher.tsx'
import './AuthForm.css'

type Mode = 'login' | 'register'
type Field = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

const MIN_PASSWORD_LENGTH = 8 // matches the minimum already used by the previous register form
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface AuthFormProps {
  /** 'login' renders /login, 'register' renders /signup. Defaults to 'login'. */
  mode?: Mode
  onLoggedIn: (user: User) => void
  /**
   * Optional client-side navigation hook (e.g. wrap your router's navigate()). When omitted, the
   * links below are plain <a href> and fall back to normal browser navigation.
   */
  onNavigate?: (path: string) => void
}

function validate(mode: Mode, name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {}
  if (mode === 'register' && !name) {
    errors.name = 'Enter your name.'
  }
  if (!email) {
    errors.email = 'Enter your email address.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'That email address looks incomplete. Check it and try again.'
  }
  if (!password) {
    errors.password = mode === 'register' ? 'Create a password.' : 'Enter your password.'
  } else if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
  }
  return errors
}

export default function AuthForm({ mode = 'login', onLoggedIn, onNavigate }: AuthFormProps) {
  const id = useId()
  const [localMode, setLocalMode] = useState<Mode>(mode)
  const isRegister = localMode === 'register'
  const submittingRef = useRef(false) // blocks rapid double-submits before state re-renders
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)

  const ids = {
    name: `${id}-name`,
    email: `${id}-email`,
    password: `${id}-password`,
  }
  const hintId = `${id}-password-hint`
  const formErrorId = `${id}-form-error`

  function describedBy(field: Field) {
    const parts: string[] = []
    if (field === 'password' && isRegister) parts.push(hintId)
    if (fieldErrors[field]) parts.push(`${ids[field]}-error`)
    return parts.length ? parts.join(' ') : undefined
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '') // never trimmed or altered

    setFormError('')
    const errors = validate(localMode, name, email, password)
    setFieldErrors(errors)

    const firstInvalid = (['name', 'email', 'password'] as Field[]).find((f) => errors[f])
    if (firstInvalid) {
      form.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      const user = isRegister ? await register(name, email, password) : await login(email, password)
      onLoggedIn(user)
    } catch (err) {
      if (err instanceof TypeError) {
        // fetch() rejects with TypeError when the network is unreachable.
        setFormError('We couldn’t reach the server. Check your connection and try again.')
      } else if (isRegister) {
        setFormError(err instanceof Error && err.message ? err.message : 'We couldn’t create your account. Please try again.')
      } else {
        // Deliberately generic: don't reveal whether an account exists for this email.
        setFormError('We couldn’t log you in. Check your email and password and try again.')
      }
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function toggleMode(newMode: Mode) {
    setLocalMode(newMode)
    setFormError('')
    setFieldErrors({})
    setShowPassword(false)
  }

  function link(path: string) {
    return {
      href: path,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        event.preventDefault()
        onNavigate(path)
      },
    }
  }

  const passwordType = showPassword ? 'text' : 'password'

  return (
    <div className="auth-container">
      <div className="auth-welcome">
        <div className="auth-welcome__content">
          <p className="auth-welcome__brand">Study Companion</p>
          <p className="auth-welcome__title">Study the way that works for you</p>
          <p className="auth-welcome__subtitle">
            Upload your slides and PDFs, then see them, hear them and reshape them until they stick.
          </p>
        </div>
      </div>

      <main className="auth-form-section">
        <div className="auth-accessibility">
          <ThemeSwitcher />
        </div>

        <div className="auth-form-wrapper">
          <div className="auth-form-header">
            <h1 className="auth-form-header__title">{isRegister ? 'Sign up' : 'Login'}</h1>
            <p className="auth-form-header__subtitle">
              {isRegister ? 'Create an account to keep your work across devices.' : 'Pick up where you left off.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            {isRegister && (
              <div className="auth-form__field">
                <label htmlFor={ids.name} className="auth-form__label">
                  Name
                </label>
                <input
                  id={ids.name}
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  className="auth-form__input"
                  aria-invalid={fieldErrors.name ? true : undefined}
                  aria-describedby={describedBy('name')}
                  disabled={submitting}
                />
                <FieldError id={`${ids.name}-error`} message={fieldErrors.name} />
              </div>
            )}

            <div className="auth-form__field">
              <label htmlFor={ids.email} className="auth-form__label">
                Email
              </label>
              <input
                id={ids.email}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="auth-form__input"
                placeholder="name@school.edu"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={describedBy('email')}
                disabled={submitting}
              />
              <FieldError id={`${ids.email}-error`} message={fieldErrors.email} />
            </div>

            <div className="auth-form__field">
              <label htmlFor={ids.password} className="auth-form__label">
                {isRegister ? 'Create password' : 'Password'}
              </label>
              <div className="auth-form__password">
                <input
                  id={ids.password}
                  name="password"
                  type={passwordType}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  maxLength={128}
                  className="auth-form__input auth-form__input--password"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={describedBy('password')}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="auth-form__reveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-controls={ids.password}
                >
                  {showPassword ? 'Hide' : 'Show'}
                  <span className="auth-visually-hidden"> password</span>
                </button>
              </div>
              {isRegister && (
                <p id={hintId} className="auth-form__hint">
                  Use at least {MIN_PASSWORD_LENGTH} characters.
                </p>
              )}
              <FieldError id={`${ids.password}-error`} message={fieldErrors.password} />
            </div>

            {formError && (
              <div role="alert" className="auth-form__notice" id={formErrorId}>
                <span className="auth-form__error-icon" aria-hidden="true">
                  ⚠
                </span>
                <span>{formError}</span>
              </div>
            )}

            <button type="submit" className="auth-form__submit" disabled={submitting}>
              {submitting && <span className="auth-form__spinner" aria-hidden="true" />}
              {submitting ? 'Please wait…' : isRegister ? 'Sign up' : 'Login'}
            </button>

            {!isRegister && (
              <div className="auth-form__alternative">
                <span className="auth-form__alternative-label">or</span>
                <button type="button" className="auth-form__guest">
                  Guest login
                </button>
              </div>
            )}
          </form>

          <p className="auth-form-footer">
            {isRegister ? 'Already have an account? ' : 'Don’t have an account? '}
            <button
              type="button"
              className="auth-form-footer__link"
              onClick={() => toggleMode(isRegister ? 'login' : 'register')}
            >
              {isRegister ? 'Login' : 'Sign up'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="auth-form__error">
      <span className="auth-form__error-icon" aria-hidden="true">
        ⚠
      </span>
      <span>{message}</span>
    </p>
  )
}
