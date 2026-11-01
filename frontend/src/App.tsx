import { useState, useEffect } from 'react'
import AuthForm from './pages/AuthForm.tsx'
import { getMe, type User } from './auth/api.ts'
import { ThemeProvider } from './theme/ThemeContext'
import { Home } from './pages/Home'
import { CollectionsRoute } from './collections/CollectionsRoute'
import { matchCollectionsRoute } from './collections/routes'


function CurrentPage() {
  const collectionsRoute = matchCollectionsRoute(window.location.pathname)
  if (collectionsRoute) {
    return <CollectionsRoute route={collectionsRoute} />
  }
  return <Home />
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [fontSize, setFontSize] = useState<number>(16)

  useEffect(() => { document.documentElement.style.fontSize = `${fontSize}px`}, [fontSize])

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  return (
    <ThemeProvider>
      {user === undefined ? (
        <p role="status">Loading…</p>
      ) : user === null ? (
        <AuthForm onLoggedIn={setUser} />
      ) : (
        <>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', justifyContent: 'flex-end', padding: '16px 32px 0px 0px' }}>
          <button onClick={() => setFontSize((prev) => Math.max(prev - 2, 12))}>Decrease Font Size</button>
          <span>{fontSize}px</span>
          <button onClick={() => setFontSize((prev) => Math.min(prev + 2, 32))}>Increase Font Size</button>
          </div>


        <CurrentPage />
        </>
      )}
    </ThemeProvider>
  )
}

export default App