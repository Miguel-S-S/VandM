import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../lib/data'
import { statusOf, ACTIVE_STATUSES } from '../lib/orders'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function AdminCalendario() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [onlyActive, setOnlyActive] = useState(true)
  useEffect(() => { listOrders().then(setOrders).catch((e) => setError(e.message)) }, [])

  const byDay = useMemo(() => {
    const map = {}
    ;(orders ?? []).filter((o) => o.estimated && o.status !== 'cancelado' && (!onlyActive || ACTIVE_STATUSES.includes(o.status)))
      .forEach((o) => { (map[o.estimated] ??= []).push(o) })
    return map
  }, [orders, onlyActive])

  const first = new Date(cur.y, cur.m, 1)
  const offset = (first.getDay() + 6) % 7 // lunes = 0
  const dim = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  const today = new Date().toISOString().slice(0, 10)
  const move = (n) => setCur(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const title = first.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <>
      <div className="row between">
        <h2>Calendario de pedidos</h2>
        <label className="check"><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Solo en curso</label>
      </div>
      <p className="muted small">Cada pedido aparece en su fecha estimada de entrega, con el color de su etapa. Tocá uno para abrirlo.</p>
      {error && <p className="alert">{error}</p>}
      <div className="row between" style={{ margin: '.5rem 0' }}>
        <button className="btn ghost" onClick={() => move(-1)}>←</button>
        <b style={{ textTransform: 'capitalize', fontSize: '1.1rem' }}>{title}</b>
        <button className="btn ghost" onClick={() => move(1)}>→</button>
      </div>
      <div className="cal">
        {DAYS.map((d) => <div key={d} className="cal-h">{d}</div>)}
        {cells.map((d, i) => {
          const key = d && iso(cur.y, cur.m, d)
          const list = d ? byDay[key] ?? [] : []
          return (
            <div key={i} className={'cal-c' + (!d ? ' empty' : '') + (key === today ? ' today' : '')}>
              {d && <span className="cal-d">{d}</span>}
              {list.map((o) => (
                <Link key={o.id} to={`/admin/pedidos?open=${o.id}`} className="cal-o" style={{ background: statusOf(o.status).color + '33', color: statusOf(o.status).color, borderColor: statusOf(o.status).color }}
                  title={`${o.customerName} · ${statusOf(o.status).label}`}>
                  #{o.number} <span className="cal-n">{o.customerName.split(' ')[0]}</span>
                </Link>
              ))}
            </div>
          )
        })}
      </div>
      <div className="row small" style={{ marginTop: '.8rem' }}>
        {['recibido', 'confirmado', 'cosiendo', 'cargando_arena', 'listo', 'entregado'].map((k) => (
          <span key={k} style={{ color: statusOf(k).color }}>● {statusOf(k).label}</span>
        ))}
      </div>
    </>
  )
}
