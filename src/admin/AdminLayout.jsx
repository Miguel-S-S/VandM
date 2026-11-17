import { NavLink, Outlet, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth, ROLES } from '../lib/auth'
import { listOrders, listPhoneRequests } from '../lib/data'

export default function AdminLayout() {
  const { isStaff, role, loading, user } = useAuth()
  const [newCount, setNewCount] = useState(0)
  const [codeCount, setCodeCount] = useState(0)
  // avisa cuántos pedidos nuevos (sin atender) hay; se actualiza cada minuto
  useEffect(() => {
    if (!isStaff) return undefined
    const tick = () => {
      listOrders().then((o) => setNewCount(o.filter((x) => x.status === 'recibido').length)).catch(() => {})
      listPhoneRequests().then((r) => setCodeCount(r.filter((x) => !x.sent).length)).catch(() => {})
    }
    tick()
    const t = setInterval(tick, 60000)
    return () => clearInterval(t)
  }, [isStaff])
  if (loading) return <p className="muted center">Cargando…</p>
  if (!isStaff) {
    return (
      <div className="center empty">
        <h2>Acceso restringido</h2>
        <p className="muted">Esta sección es solo para administración y dueña.</p>
        {user ? (
          <div className="panel small" style={{ textAlign: 'left', maxWidth: 520 }}>
            <p>Estás ingresado como <b>{user.email}</b> con rol <b>{ROLES[role]}</b>.</p>
            <p className="muted">Si deberías ser administrador o dueña, ejecutá en Supabase (SQL Editor):</p>
            <code style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {`update public.profiles set role = 'admin' where email = '${user.email}';`}
            </code>
            <p className="muted">(para la dueña usá <code>'duena'</code>) y luego cerrá sesión y volvé a ingresar.
              {user.profileMissing && ' Tu usuario no tenía perfil: corré también supabase/etapa2.sql.'}</p>
          </div>
        ) : <Link to="/ingresar" className="btn">Ingresar</Link>}
      </div>
    )
  }
  return (
    <>
      <div className="admin-head">
        <h1>Panel <small className="muted">· {ROLES[role]}</small></h1>
        <nav className="tabs">
          <NavLink to="/admin/pedidos">Pedidos{newCount > 0 && <b className="badge-inline">{newCount}</b>}</NavLink>
          <NavLink to="/admin/calendario">Calendario</NavLink>
          <NavLink to="/admin/verificaciones">Verificaciones{codeCount > 0 && <b className="badge-inline">{codeCount}</b>}</NavLink>
          <NavLink to="/admin/estados">Estados</NavLink>
        </nav>
        <nav className="tabs">
          <span className="tabs-label">Catálogo</span>
          <NavLink to="/admin/productos">Productos</NavLink>
          <NavLink to="/admin/presupuestos">Lista de precios</NavLink>
          <NavLink to="/admin/categorias">Categorías</NavLink>
          <NavLink to="/admin/actividades">Actividades</NavLink>
          <NavLink to="/admin/noticias">Noticias</NavLink>
        </nav>
        {(role === 'duena' || role === 'admin') && (
          <nav className="tabs">
            <span className="tabs-label">Costos</span>
            <NavLink to="/admin/insumos">Insumos</NavLink>
            <NavLink to="/admin/proveedores">Proveedores</NavLink>
            <NavLink to="/admin/compras">Compras</NavLink>
            <NavLink to="/admin/costos">Costos y tiempos</NavLink>
          </nav>
        )}
        <nav className="tabs">
          <span className="tabs-label">Sistema</span>
          <NavLink to="/admin/apariencia">Apariencia</NavLink>
          <NavLink to="/admin/auditoria">Auditoría</NavLink>
        </nav>
      </div>
      <Outlet />
    </>
  )
}