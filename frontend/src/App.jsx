import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      })

      if (response.data.access_token) {
        setToken(response.data.access_token)
      } else {
        setError(response.data.message || 'Erreur de connexion')
      }
    } catch (err) {
      setError('Impossible de contacter le serveur')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Connexion</h1>

      {!token ? (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '12px' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px' }}
              required
            />
          </div>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button type="submit" style={{ padding: '8px 16px' }}>
            Se connecter
          </button>
        </form>
      ) : (
        <div>
          <p>Connexion réussie.</p>
          <p style={{ wordBreak: 'break-all', fontSize: '12px', color: '#666' }}>
            Token : {token}
          </p>
        </div>
      )}
    </div>
  )
}

export default App
