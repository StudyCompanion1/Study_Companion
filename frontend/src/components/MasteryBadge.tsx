import { Icon } from './Icon'
import './MasteryBadge.css'

export type MasteryLevel = 'low' | 'review' | 'strong'

const ICON_BY_LEVEL = { low: 'masteryLow', review: 'masteryReview', strong: 'masteryStrong' } as const

export function MasteryBadge({ level, label }: { level: MasteryLevel; label: string }) {
  return (
    <span className={`mastery-badge mastery-badge--${level}`}>
      <Icon name={ICON_BY_LEVEL[level]} size={16} />
      {label}
    </span>
  )
}
