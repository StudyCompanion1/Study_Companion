import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ThemeProvider } from '../theme/ThemeContext'
import { CollectionPage } from './CollectionPage'
import { CollectionsPage } from './CollectionsPage'
import { collections, MOCK_NOW, notes } from './collectionsData'
import { notesFor } from './helpers'

/* Preview entry, no login needed, while `npm run dev:frontend` is running:
     http://localhost:5173/collections-preview.html                     → screen 1
     http://localhost:5173/collections-preview.html?collection=bio201   → screen 2 (Cell biology)
   Uses MOCK_NOW so times match Figma ("2 h ago"). In the real app, open /collections after login. */

const collectionId = new URLSearchParams(window.location.search).get('collection')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {collectionId ? (
        <CollectionPage
          collection={collections.find((collection) => collection.id === collectionId)}
          notes={notesFor(collectionId, notes)}
          now={MOCK_NOW}
        />
      ) : (
        <CollectionsPage collections={collections} now={MOCK_NOW} />
      )}
    </ThemeProvider>
  </StrictMode>,
)
