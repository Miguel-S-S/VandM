import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth, ROLES } from '../lib/auth'

export default function AdminLayout() {
  const { isStaff, role, loading } = useAuth()
  if (loading) return <p className="muted center">Cargando…</p>
  if (!isStaff) {
    return (
      <div className="center empty">
        <h2>Acceso restringido</h2>
        <p className="muted">Esta sección es solo para administración y dueña.</p>
        <Link to="/ingresar" className="btn">Ingresar</Link>
      </div>
    )
  }
  return (
    <>
      <div className="admin-head">
        <h1>Panel <small className="muted">· {ROLES[role]}</small></h1>
        <nav className="tabs">
          <NavLink to="/admin/productos">Productos</NavLink>
          <NavLink to="/admin/apariencia">Apariencia</NavLink>
          <NavLink to="/admin/auditoria">Auditoría</NavLink>
        </nav>
      </div>
      <Outlet />
    </>
  )
}
