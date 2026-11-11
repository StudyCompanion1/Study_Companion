import { useId, useState, type InputHTMLAttributes } from 'react'
import { Icon } from './Icon'
import './TextField.css'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string
  type?: 'text' | 'email' | 'password'
  /** Shown below the field when there's no error. */
  hint?: string
  /** Switches the field to its error state; replaces the hint. */
  error?: string
  /** Adds a Show/Hide toggle inside the box. Only meaningful with type="password". */
  showReveal?: boolean
  id?: string
}

export function TextField({
  label,
  type = 'text',
  hint,
  error,
  showReveal,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)

  const isPassword = type === 'password'
  const resolvedType = isPassword && showReveal ? (visible ? 'text' : 'password') : type
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={['text-field', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className="text-field__label">
        {label}
      </label>
      <div className={`text-field__box${error ? ' is-error' : ''}`}>
        <input
          id={inputId}
          type={resolvedType}
          className="text-field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword && showReveal && (
          <button
            type="button"
            className="text-field__reveal"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-controls={inputId}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
            {visible ? 'Hide' : 'Show'}
            <span className="text-field__visually-hidden"> password</span>
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="text-field__helper text-field__helper--error">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-field__helper">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
