import { useState, useEffect } from 'react'
import AuthForm from './auth/AuthForm.tsx'
import { getMe, type User } from './auth/api.ts'
import { ThemeProvider } from './theme/ThemeContext'
import { Home } from './pages/Home'

function App() {
  // undefined while we ask the backend whether someone is already logged in
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
        <Home />
      )}
    </ThemeProvider>
  )
}

export default App
