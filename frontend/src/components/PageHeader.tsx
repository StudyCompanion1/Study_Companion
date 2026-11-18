import { Icon, type IconName } from './Icon'
import './PageHeader.css'

export function PageHeader({
  title,
  summary,
  actionLabel,
  actionIcon = 'upload',
  onAction,
  actionDisabled = false,
}: {
  title: string
  summary: string
  actionLabel?: string
  actionIcon?: IconName
  onAction?: () => void
  /** True while the action is running (e.g. an upload in progress), so it can't be clicked twice. */
  actionDisabled?: boolean
}) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__summary">{summary}</p>
      </div>
      {actionLabel && (
        <button type="button" className="page-header__action" onClick={onAction} disabled={actionDisabled}>
          <Icon name={actionIcon} size={20} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
