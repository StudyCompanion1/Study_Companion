import { Icon, type IconName } from './Icon'
import './SessionCard.css'

export interface Session {
  subject: string
  kind: 'slides' | 'file'
  band: 'green' | 'yellow' | 'blue'
  title: string
  meta: string
  percent: number
}

const KIND_ICON: Record<Session['kind'], IconName> = { slides: 'slides', file: 'file' }

export function SessionCard({ subject, kind, band, title, meta, percent }: Session) {
  return (
    <a href="#" className="session-card">
      <div className={`session-card__band session-card__band--${band}`}>
        <Icon name={KIND_ICON[kind]} size={20} />
        <span className="session-card__subject">{subject}</span>
      </div>
      <div className="session-card__body">
        <p className="session-card__title">{title}</p>
        <p className="session-card__meta">{meta}</p>
        <div className="session-card__progress">
          <div className="session-card__progress-value" style={{ width: `${percent}%` }} />
        </div>
        <div className="session-card__foot">
          <span className="session-card__percent">{percent}% through</span>
          <span className="session-card__resume">
            Resume
            <Icon name="chevronRight" size={16} />
          </span>
        </div>
      </div>
    </a>
  )
}
