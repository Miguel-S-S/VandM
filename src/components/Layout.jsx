import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useCart } from '../lib/cart'
import { useAuth, ROLES } from '../lib/auth'
import { useSettings } from '../lib/settings'
import Socials from './Socials'
import { useVisits } from '../lib/visits'

export default function Layout() {
  const { count } = useCart()
  const { role, isStaff, signOut, demo, setDemoRole, user } = useAuth()
  const { settings } = useSettings()
  const { pathname } = useLocation()
  const nav = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useVisits(pathname, isStaff)

  return (
    <div className="app">
      {demo && (
        <div className="demo-bar">
          <span>MODO DEMO · datos locales</span>
          <label>
            Ver como:&nbsp;
            <select value={role} onChange={(e) => setDemoRole(e.target.value)}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
      )}
      <header className="header">
        <Link to="/" className="brand" aria-label="Inicio">
          <img src="/logo.jpg" alt="V&M" />
          <span>{settings.storeName}</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>Tienda</NavLink>
          <NavLink to="/actividades">Actividades</NavLink>
          <NavLink to="/noticias">Noticias</NavLink>
          {user && !isStaff && <NavLink to="/mis-pedidos">Mis pedidos</NavLink>}
          {isStaff && <NavLink to="/admin">Panel</NavLink>}
        </nav>
        <div className="header-actions">
          <Link to="/carrito" className="cart-btn" aria-label="Carrito">
            🛒{count > 0 && <b className="badge">{count}</b>}
          </Link>
          {user
            ? <button className="link" onClick={async () => { await signOut(); nav('/') }}>Salir</button>
            : !demo && <Link to="/ingresar" className="link">Ingresar</Link>}
        </div>
      </header>

      <main className="main"><Outlet /></main>

      <footer className="footer">
        <img src="/logo.jpg" alt="V&M" className="footer-logo" />
        <p>{settings.tagline}</p>
        <Socials />
        <small>© {new Date().getFullYear()} {settings.storeName}</small>
      </footer>
    </div>
  )
}
