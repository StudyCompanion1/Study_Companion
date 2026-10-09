import { Icon } from './Icon'
import { MasteryBadge, type MasteryLevel } from './MasteryBadge'
import './PracticeRow.css'

export interface PracticeTopic {
  title: string
  meta: string
  missedLabel: string
  level: Extract<MasteryLevel, 'low' | 'review'>
}

export function PracticeRow({ title, meta, missedLabel, level }: PracticeTopic) {
  return (
    <div className="list-row practice-row">
      <div className="practice-row__badge">
        <MasteryBadge level={level} label={missedLabel} />
      </div>
      <div className="practice-row__main">
        <p className="practice-row__title">{title}</p>
        <p className="practice-row__meta">{meta}</p>
      </div>
      <button type="button" className="practice-row__action" aria-label={`Practice ${title}`}>
        <Icon name="practice" size={20} />
        Practice
      </button>
    </div>
  )
}
