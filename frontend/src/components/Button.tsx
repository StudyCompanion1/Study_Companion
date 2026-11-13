import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import './Button.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: one per view (the thing the screen is for). secondary: default. quiet: low-emphasis, inline. */
  variant?: 'primary' | 'secondary' | 'quiet'
  /** sm (36px) only inside dense rows; md (44px) otherwise. */
  size?: 'md' | 'sm'
  icon?: IconName
  /** Stretches to the width of its container, for stacked form actions. */
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth && 'button--full',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {icon && <Icon name={icon} size={20} />}
      <span className="button__label">{children}</span>
    </button>
  )
}
