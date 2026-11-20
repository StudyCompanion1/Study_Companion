import { useState, useEffect } from 'react'
import AuthForm from './pages/AuthForm.tsx'
import { getMe, type User } from './auth/api.ts'
import { ThemeProvider } from './theme/ThemeContext'
import { Home } from './pages/Home'
import { CollectionsRoute } from './collections/CollectionsRoute'
import { matchCollectionsRoute } from './collections/routes'


function CurrentPage({ user }: { user: User }) {
  const collectionsRoute = matchCollectionsRoute(window.location.pathname)
  if (collectionsRoute) {
    return <CollectionsRoute route={collectionsRoute} />
  }
  return <Home user={user} />
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

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
        <CurrentPage user={user} />
      )}
    </ThemeProvider>
  )
}

export default App