import { Icon } from '../components/Icon'
import { formatRelative, plural } from './helpers'
import type { Collection } from './types'
import './collections-tokens.css'
import './CollectionCard.css'

/* Follows the SessionCard pattern: one <a> wrapping a colour band and a body.
   Figma: Library and Wireframes → CollectionCard (default, hover). */

export function CollectionCard({
  collection,
  href,
  now,
}: {
  collection: Collection
  href: string
  /** Lets the preview and tests pin "now"; defaults to the real time. */
  now?: Date
}) {
  const { code, name, term, color, noteCount, updatedAt } = collection
  const notesLabel = plural(noteCount, 'note')
  const edited = `Edited ${formatRelative(updatedAt, now).toLowerCase()}`

  return (
    <a
      href={href}
      className="collection-card"
      aria-label={`${name}, ${code}, ${term}, ${notesLabel}, ${edited}`}
    >
      {/* Colour is only for recognition: the code and name always show. */}
      <div className={`collection-card__band collection-card__band--${color}`}>
        <span className="collection-card__code">{code}</span>
      </div>
      <div className="collection-card__body">
        <p className="collection-card__name">{name}</p>
        <p className="collection-card__meta">{term}</p>
        <div className="collection-card__foot">
          <span className="collection-card__stat">
            {/* Existing icons stand in for Figma's doc and clock icons. */}
            <Icon name="file" size={16} />
            {notesLabel}
          </span>
          <span className="collection-card__stat">
            <Icon name="masteryReview" size={16} />
            {edited}
          </span>
        </div>
      </div>
    </a>
  )
}
