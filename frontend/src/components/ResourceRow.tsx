import { Icon } from './Icon'
import './ResourceRow.css'

export interface WebResource {
  title: string
  source: string
  url: string
}

export function ResourceRow({ title, source, url }: WebResource) {
  return (
    <div className="list-row resource-row">
      <div className="resource-row__main">
        <p className="resource-row__title">{title}</p>
        <p className="resource-row__meta">{source}</p>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="resource-row__action">
        <Icon name="linkExternal" size={20} />
        Open
      </a>
    </div>
  )
}
