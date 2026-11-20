import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { ThemeProvider } from '../theme/ThemeContext'
import { SearchPage } from './SearchPage'

/* Preview entry, no login needed, while `npm run dev` is running:
     http://localhost:5173/search-preview.html
   Use /api/url-resources normally (BRAVE_API_KEY must be set on the backend) — this just skips auth. */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SearchPage />
    </ThemeProvider>
  </StrictMode>,
)
