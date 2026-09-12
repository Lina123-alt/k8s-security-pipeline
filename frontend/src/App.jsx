import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = 'http://localhost:8000'

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
}

const ROLE_LABELS = {
  user: 'Client',
  operator: 'Opérateur',
  admin: 'Administrateur',
}

function AuthScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password })

      if (response.data.access_token) {
        onLoginSuccess({
          token: response.data.access_token,
          role: response.data.role,
          email: response.data.email,
        })
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
      await axios.post(`${API_URL}/auth/register`, { email, password })
      setSuccessMessage('Compte créé. Tu peux te connecter maintenant.')
      setMode('login')
      setPassword('')
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Impossible de créer le compte')
      }
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode)
    setError(null)
    setSuccessMessage(null)
  }

  return (
    <div className="app-shell">
      <div className="app-visual">
        <p className="app-visual-top">Orderly</p>
        <div className="app-visual-mid">
          <h2>Toutes vos commandes,<br />au même endroit.</h2>
          <p>Suivez, créez et gérez vos commandes clients simplement, avec un accès adapté à chaque membre de l'équipe.</p>
        </div>
        <div></div>
      </div>

      <div className="app-form-panel">
        <div className="app-form-inner">
          <h1>{mode === 'login' ? 'Bon retour' : 'Créer un compte'}</h1>
          <p className="app-form-sub">
            {mode === 'login' ? 'Connectez-vous pour accéder à vos commandes.' : 'Quelques informations pour commencer.'}
          </p>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            <div className="field-group">
              <label>Email</label>
              <div className="field-input-wrap">
                <MailIcon />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="field-group">
              <label>Mot de passe</label>
              <div className="field-input-wrap">
                <LockIcon />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            {error && <p className="app-error">{error}</p>}
            {successMessage && <p className="app-success">{successMessage}</p>}

            <button type="submit" className="app-submit">
              {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
              <ArrowIcon />
            </button>
          </form>

          <p className="app-switch">
            {mode === 'login' ? (
              <>Pas encore de compte ? <button onClick={() => switchMode('register')}>Créer un compte</button></>
            ) : (
              <>Déjà un compte ? <button onClick={() => switchMode('login')}>Se connecter</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ session, onLogout }) {
  const { token, role, email } = session

  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState(null)
  const [busyOrderId, setBusyOrderId] = useState(null)

  const authHeader = { headers: { Authorization: `Bearer ${token}` } }
  const canManage = role === 'operator' || role === 'admin'

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/orders/`, authHeader),
        axios.get(`${API_URL}/orders/products`, authHeader),
      ])
      setOrders(ordersRes.data)
      setProducts(productsRes.data)
      if (!selectedProduct && productsRes.data.length > 0) {
        setSelectedProduct(productsRes.data[0].name)
      }
    } catch (err) {
      setError('Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unitPrice = products.find((p) => p.name === selectedProduct)?.price || 0
  const estimatedTotal = (unitPrice * quantity).toFixed(2)

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      await axios.post(`${API_URL}/orders/`, {
        product: selectedProduct,
        quantity: parseInt(quantity, 10),
      }, authHeader)

      setQuantity(1)
      loadData()
    } catch (err) {
      setError('Impossible de créer la commande')
    }
  }

  const handleAdvanceStatus = async (orderId) => {
    setBusyOrderId(orderId)
    try {
      await axios.patch(`${API_URL}/orders/${orderId}/status`, {}, authHeader)
      loadData()
    } catch (err) {
      setError('Impossible de faire avancer cette commande')
    } finally {
      setBusyOrderId(null)
    }
  }

  const handleDelete = async (orderId) => {
    setBusyOrderId(orderId)
    try {
      await axios.delete(`${API_URL}/orders/${orderId}`, authHeader)
      loadData()
    } catch (err) {
      setError('Impossible de supprimer cette commande')
    } finally {
      setBusyOrderId(null)
    }
  }

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <p className="dash-wordmark">Orderly</p>

        <div className="dash-header-right">
          <div className="dash-identity">
            <span className={`role-pill role-${role}`}>{ROLE_LABELS[role] || role}</span>
            <span className="dash-email">{email}</span>
          </div>
          <button className="dash-logout" onClick={onLogout}>Se déconnecter</button>
        </div>
      </header>

      <main className="dash-main">
        <section className="dash-create">
          <h2>Nouvelle commande</h2>
          <form onSubmit={handleCreateOrder} className="dash-create-form">
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
              {products.map((p) => (
                <option key={p.name} value={p.name}>{p.name} — {p.price.toFixed(2)} €</option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />

            <div className="dash-total-preview">
              <span>Total</span>
              <strong>{estimatedTotal} €</strong>
            </div>

            <button type="submit">Créer</button>
          </form>
          {error && <p className="app-error">{error}</p>}
        </section>

        <section className="dash-list">
          <h2>{canManage ? 'Toutes les commandes' : 'Vos commandes'}</h2>

          {loading ? (
            <p className="dash-empty">Chargement...</p>
          ) : orders.length === 0 ? (
            <p className="dash-empty">Aucune commande pour l'instant.</p>
          ) : (
            <div className="dash-table">
              {orders.map((order) => (
                <div className="dash-row" key={order.id}>
                  <div className="dash-row-left">
                    <div className="dash-row-product">{order.product}</div>
                    <div className="dash-row-sub">
                      Quantité : {order.quantity}
                      {canManage && ` · ${order.customer_email}`}
                    </div>
                  </div>

                  <div className="dash-row-right">
                    <span className={`status-pill status-${order.status}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className="dash-row-amount">{order.total_price.toFixed(2)} €</span>

                    {canManage && (
                      <div className="dash-row-actions">
                        {order.status !== 'shipped' && (
                          <button
                            className="dash-advance"
                            disabled={busyOrderId === order.id}
                            onClick={() => handleAdvanceStatus(order.id)}
                          >
                            Avancer
                          </button>
                        )}
                        <button
                          className="dash-delete"
                          disabled={busyOrderId === order.id}
                          onClick={() => handleDelete(order.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('orderly_session')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (newSession) => {
    localStorage.setItem('orderly_session', JSON.stringify(newSession))
    setSession(newSession)
  }

  const handleLogout = () => {
    localStorage.removeItem('orderly_session')
    setSession(null)
  }

  if (!session) {
    return <AuthScreen onLoginSuccess={handleLogin} />
  }

  return <Dashboard session={session} onLogout={handleLogout} />
}

export default App
