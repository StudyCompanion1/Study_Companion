import { Icon } from '../components/Icon'
import type { MaterialKind } from './types'

/* The icon for a type of study material. Slides and PDF reuse the shared Icon; "doc", "audio" and "image"
   aren't in Icon.tsx yet, so they're drawn here in the same style (20px grid, round strokes,
   currentColor). Move them into Icon.tsx if the team agrees. Decorative: always shown with a word. */

const EXTRA_PATHS = {
  image: 'M3.33333 4.16667H16.6667V15.8333H3.33333V4.16667ZM3.33333 13.3333L7.08333 9.58333L10 12.5L12.0833 10.4167L16.6667 15M12.5 7.5H12.5083',
  doc: 'M15 5.83333L11.6667 2.5H5V17.5H15V5.83333ZM11.6667 2.5V5.83333H15M7.5 10H12.5M7.5 13.3333H12.5',
  audio:
    'M7.5 14.5833V4.16667L16.6667 2.5V12.9167M7.5 14.5833C7.5 15.7339 6.567 16.6667 5.41667 16.6667C4.26633 16.6667 3.33333 15.7339 3.33333 14.5833C3.33333 13.4328 4.26633 12.5 5.41667 12.5C6.567 12.5 7.5 13.4328 7.5 14.5833ZM16.6667 12.9167C16.6667 14.0672 15.7337 15 14.5833 15C13.433 15 12.5 14.0672 12.5 12.9167C12.5 11.7661 13.433 10.8333 14.5833 10.8333C15.7337 10.8333 16.6667 11.7661 16.6667 12.9167Z',
} as const

export function MaterialIcon({ kind, size = 18 }: { kind: MaterialKind; size?: number }) {
  if (kind === 'slides') return <Icon name="slides" size={size} />
  if (kind === 'pdf') return <Icon name="file" size={size} />
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={EXTRA_PATHS[kind]}
        stroke="currentColor"
        strokeWidth={1.45833}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
