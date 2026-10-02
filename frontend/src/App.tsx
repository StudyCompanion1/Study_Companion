import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [status, setScoreStatus] = useState('loading...')

  useEffect(() => {
    fetch('api/health')
      .then((res) => res.json())
      .then((data) => setScoreStatus(data.status))
      .catch(() => setScoreStatus('error'))
  }, [])

  return <h1>Backend status: {status}</h1>
}

export default App
