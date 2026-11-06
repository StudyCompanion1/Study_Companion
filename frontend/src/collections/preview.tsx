import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ThemeProvider } from '../theme/ThemeContext'
import { CollectionsRoute } from './CollectionsRoute'
import { MOCK_NOW } from './collectionsData'

/* Preview entry, no login needed, while `npm run dev:frontend` is running:
     http://localhost:5173/collections-preview.html                     → screen 1
     http://localhost:5173/collections-preview.html?collection=bio201   → screen 2 (Cell biology)
   Uses MOCK_NOW so times match Figma ("2 h ago"). In the real app, open /collections after login. */

const collectionId = new URLSearchParams(window.location.search).get('collection')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CollectionsRoute
        route={collectionId ? { page: 'one', collectionId } : { page: 'all' }}
        now={MOCK_NOW}
      />
    </ThemeProvider>
  </StrictMode>,
)
