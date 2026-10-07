import { useState, useEffect } from 'react'
import './App.css'
import AuthForm from './auth/AuthForm.tsx'
import { getMe, logout, type User } from './auth/api.ts'

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

  // Placeholder until the Home Page / Dashboard (UX-3) replaces it
  return (
    <main>
      <h1>Welcome, {user.name}</h1>
      <p>You are logged in as {user.email}.</p>
      <p>
        <button type="button" onClick={() => logout().then(() => setUser(null))}>
          Log out
        </button>
      </p>
    </main>
  )
}

export default App
