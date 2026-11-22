import { useState, useEffect } from 'react'
import AuthForm from './pages/AuthForm.tsx'
import { getMe, logout, type User } from './auth/api.ts'
import { SessionProvider } from './auth/SessionContext'
import { ThemeProvider } from './theme/ThemeContext'
import { Home } from './pages/Home'
import { CollectionsRoute } from './collections/CollectionsRoute'
import { matchCollectionsRoute } from './collections/routes'
import { SearchPage } from './search/SearchPage'


function CurrentPage({ user }: { user: User }) {
  const collectionsRoute = matchCollectionsRoute(window.location.pathname)
  if (collectionsRoute) {
    return <CollectionsRoute route={collectionsRoute} />
  }
  if (window.location.pathname === '/search') {
    return <SearchPage />
  }
  return <Home user={user} />
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  // For Guests: A guest who hits a limit is sent to the sign-up form (registration, not login)
  function goToSignUp() {
    logout()
      .catch(() => {}) // Even if request fails, shows the sign-up form
      .finally(() => {
        window.history.replaceState(null, '', '/')
        setAuthMode('register')
        setUser(null)
      })
  }

  
  return (
    <ThemeProvider>
      {user === undefined ? (
        <p role="status">Loading…</p>
      ) : user === null ? (
        <AuthForm 
          mode={authMode}
          onLoggedIn={(loggedIn) => {
            setAuthMode('login') // For Guests: A later logout should come back to the login form.
            setUser(loggedIn)
        }} 
        />
      ):(
        <SessionProvider user={user} onSignUp={goToSignUp}>
          <CurrentPage user={user} />
        </SessionProvider>
      )}
    </ThemeProvider>
  )
}

export default App