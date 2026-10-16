import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ThemeProvider } from '../theme/ThemeContext'
import { CollectionsPage } from './CollectionsPage'
import { collections, MOCK_NOW } from './collectionsData'

/* Preview entry: open http://localhost:5173/collections-preview.html while `npm run dev:frontend`
   is running. Skips login and App.tsx, so no existing file needs to change. */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CollectionsPage collections={collections} now={MOCK_NOW} />
    </ThemeProvider>
  </StrictMode>,
)
