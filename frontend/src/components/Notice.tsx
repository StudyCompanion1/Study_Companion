import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import './Notice.css'

export type NoticeTone = 'info' | 'success' | 'warning' | 'error'

const TONE_ICON: Record<NoticeTone, IconName> = {
  info: 'info',
  success: 'check',
  warning: 'alert',
  error: 'alert',
}

export interface NoticeProps {
  tone?: NoticeTone
  title?: string
  children: ReactNode
  className?: string
}

/** Colour is never the only signal: every tone pairs its background/border with an icon and words. */
export function Notice({ tone = 'info', title, children, className }: NoticeProps) {
  return (
    <div
      className={['notice', `notice--${tone}`, className].filter(Boolean).join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="notice__icon">
        <Icon name={TONE_ICON[tone]} size={24} />
      </span>
      <div className="notice__content">
        {title && <p className="notice__title">{title}</p>}
        <p className="notice__text">{children}</p>
      </div>
    </div>
  )
}
