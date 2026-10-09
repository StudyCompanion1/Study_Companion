import { useState, useEffect } from 'react'
import AuthForm from './auth/AuthForm.tsx'
import { getMe, type User } from './auth/api.ts'
import { Home } from './pages/Home'

function App() {
  // undefined while we ask the backend whether someone is already logged in
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  if (user === undefined) return <p role="status">Loading…</p>

  if (user === null) return <AuthForm onLoggedIn={setUser} />

  return <Home />
}

export default App
