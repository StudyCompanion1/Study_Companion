import { Icon } from './Icon'
import './PageHeader.css'

export function PageHeader({
  title,
  summary,
  actionLabel,
  onAction,
}: {
  title: string
  summary: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__summary">{summary}</p>
      </div>
      {actionLabel && (
        <button type="button" className="page-header__action" onClick={onAction}>
          <Icon name="upload" size={20} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
