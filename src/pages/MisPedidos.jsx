import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../lib/data'
import { useAuth } from '../lib/auth'
import { fmtMoney } from '../lib/format'
import { fmtDay } from '../lib/orders'
import { useStatuses } from '../lib/statuses'

export function StatusBadge({ status }) {
  const { statusOf } = useStatuses()
  const s = statusOf(status)
  return <span className="pill" style={{ background: s.color + '33', color: s.color }}>{s.label}</span>
}

// Barra de avance del pedido
export function Progress({ status }) {
  const { steps } = useStatuses()
  if (status === 'cancelado') return null
  const idx = steps.findIndex((s) => s.key === status)
  return (
    <ol className="progress">
      {steps.map((s, i) => <li key={s.key} className={i <= idx ? 'done' : ''}><span />{s.label}</li>)}
    </ol>
  )
}

export default function MisPedidos() {
  const { user, demo } = useAuth()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { if (user || demo) listOrders().then(setOrders).catch((e) => setError(e.message)) }, [user, demo])

  if (!user && !demo) return <div className="center empty"><h2>Ingresá para ver tus pedidos</h2><Link to="/ingresar" className="btn">Ingresar</Link></div>
  return (
    <>
      <h1>Mis pedidos</h1>
      {error && <p className="alert">{error}</p>}
      {orders?.length === 0 && <p className="muted">Todavía no hiciste pedidos.</p>}
      <div className="stack">
        {orders?.map((o) => (
          <article key={o.id} className="panel">
            <div className="row between"><b>Pedido N° {o.number}</b><StatusBadge status={o.status} /></div>
            <p className="muted small">{new Date(o.createdAt).toLocaleDateString('es-AR')} · Entrega estimada: {fmtDay(o.estimated)}</p>
            <Progress status={o.status} />
            <ul className="plain">
              {o.items.map((i, k) => <li key={k}>{i.qty} × {i.name} {i.label} <span className="muted">— {fmtMoney(i.price * i.qty)}</span></li>)}
            </ul>
            <b>Total {fmtMoney(o.total)}</b>
          </article>
        ))}
      </div>
    </>
  )
}
