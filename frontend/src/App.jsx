import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function App() {
  const [mode, setMode] = useState('login') // 'login' ou 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

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

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
      })

      setSuccessMessage('Compte créé avec succès. Tu peux te connecter maintenant.')
      setMode('login')
      setPassword('')
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(JSON.stringify(err.response.data.detail))
      } else {
        setError('Impossible de créer le compte')
      }
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>

      {!token ? (
        <>
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
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
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

            <button type="submit" style={{ padding: '8px 16px' }}>
              {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          <p style={{ marginTop: '16px' }}>
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <button
                  onClick={() => { setMode('register'); setError(null); setSuccessMessage(null) }}
                  style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null); setSuccessMessage(null) }}
                  style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </>
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
