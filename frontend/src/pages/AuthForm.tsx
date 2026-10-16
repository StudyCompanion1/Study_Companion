import { useRef, useState, type FormEvent } from 'react'
import { login, register, type User } from '../auth/api.ts'
import { ThemeSwitcher } from '../components/ThemeSwitcher.tsx'
import { Icon, type IconName } from '../components/Icon.tsx'
import { PageHeader } from '../components/PageHeader.tsx'
import { TextField } from '../components/TextField.tsx'
import { Button } from '../components/Button.tsx'
import { Notice } from '../components/Notice.tsx'
import './AuthForm.css'

type Mode = 'login' | 'register'
type Field = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

const MIN_PASSWORD_LENGTH = 8 // matches the minimum already used by the previous register form
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'highlighter', title: 'Mark it up', body: 'Highlight and draw on your slides, with colours that mean something.' },
  { icon: 'speaker', title: 'Hear it', body: 'Have any slide, page, note or transcript read aloud at your speed.' },
  { icon: 'outline', title: 'See the big picture', body: 'Get an outline of your material and your notes, slide by slide.' },
]

interface AuthFormProps {
  /** 'login' renders /login, 'register' renders /signup. Defaults to 'login'. */
  mode?: Mode
  onLoggedIn: (user: User) => void
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

export default function AuthForm({ mode = 'login', onLoggedIn }: AuthFormProps) {
  const [localMode, setLocalMode] = useState<Mode>(mode)
  const isRegister = localMode === 'register'
  const submittingRef = useRef(false) // blocks rapid double-submits before state re-renders
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

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
  }

  return (
    <div className="auth-container">
      <div className="auth-welcome">
        <div className="auth-welcome__brand">
          <span className="auth-welcome__mark" aria-hidden="true">
            SC
          </span>
          <span className="auth-welcome__name">Study Companion</span>
        </div>

        <div className="auth-welcome__pitch">
          <p className="auth-welcome__title">Study the way that works for you</p>
          <p className="auth-welcome__subtitle">
            Upload your slides and PDFs, then see them, hear them and reshape them until they stick.
          </p>
        </div>

        <div className="auth-welcome__features">
          {FEATURES.map((feature) => (
            <div className="auth-welcome__feature" key={feature.title}>
              <Icon name={feature.icon} size={24} />
              <div className="auth-welcome__feature-text">
                <p className="auth-welcome__feature-title">{feature.title}</p>
                <p className="auth-welcome__feature-body">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="auth-form-section">
        <div className="auth-accessibility">
          <ThemeSwitcher />
        </div>

        <div className="auth-form-wrapper">
          <PageHeader
            title={isRegister ? 'Sign up' : 'Login'}
            summary={isRegister ? 'Create an account to keep your work across devices.' : 'Pick up where you left off.'}
          />

          <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            {isRegister && (
              <TextField
                label="Name"
                name="name"
                type="text"
                autoComplete="name"
                maxLength={100}
                error={fieldErrors.name}
                disabled={submitting}
              />
            )}

            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@school.edu"
              error={fieldErrors.email}
              disabled={submitting}
            />

            <TextField
              label={isRegister ? 'Create password' : 'Password'}
              name="password"
              type="password"
              showReveal
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              maxLength={128}
              hint={isRegister ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
              error={fieldErrors.password}
              disabled={submitting}
            />

            {formError && <Notice tone="error">{formError}</Notice>}

            <Button type="submit" variant="primary" fullWidth disabled={submitting}>
              {submitting && <span className="auth-form__spinner" aria-hidden="true" />}
              {submitting ? 'Please wait…' : isRegister ? 'Sign up' : 'Login'}
            </Button>

            {!isRegister && (
              <div className="auth-form__alternative">
                <span className="auth-form__alternative-label">or</span>
                <Button type="button" variant="secondary" fullWidth>
                  Guest login
                </Button>
              </div>
            )}
          </form>

          <p className="auth-form-footer">
            {isRegister ? 'Already have an account? ' : 'Don’t have an account? '}
            <Button variant="quiet" size="sm" onClick={() => toggleMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Login' : 'Sign up'}
            </Button>
          </p>
        </div>
      </main>
    </div>
  )
}
