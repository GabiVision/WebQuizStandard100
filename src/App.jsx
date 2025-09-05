import { useState } from 'react'
import Dashboard from './Dashboard'

function App() {
  // 🔹 Login originale (immutato)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  const handleLogin = () => {
    if (email && password) {
      setLoggedIn(true)
    } else {
      alert("Inserisci email e password")
    }
  }

  if (loggedIn) {
    // 🔹 Passiamo l'email all’area loggata (utile per lo storico, se vorrai)
    return <Dashboard userEmail={email} onLogout={() => setLoggedIn(false)} />
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem' }}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  )
}

export default App