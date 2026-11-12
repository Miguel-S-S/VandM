import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listOrders, updateOrder } from '../lib/data'
import { useSettings } from '../lib/settings'
import { fmtMoney, fmtDate } from '../lib/format'
import { STATUSES, ACTIVE_STATUSES, statusOf, fmtDay, waNumber } from '../lib/orders'
import { StatusBadge, Progress } from '../pages/MisPedidos'

export default function AdminPedidos() {
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('activos')
  const [params, setParams] = useSearchParams()
  const open = params.get('open')
  const [error, setError] = useState('')
  const { settings } = useSettings()
  const load = () => listOrders().then(setOrders).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const shown = orders?.filter((o) => filter === 'todos' ? true : filter === 'activos' ? ACTIVE_STATUSES.includes(o.status) : o.status === filter)
  const sel = orders?.find((o) => o.id === open)

  const patch = async (o, p) => {
    setError('')
    try { await updateOrder(o.id, p); await load() } catch (e) { setError(e.message) }
  }
  const msgFor = (o) =>
    `Hola ${o.customerName.split(' ')[0]}! Tu pedido N° ${o.number} de ${settings.storeName} está: ${statusOf(o.status).label}.` +
    (['listo'].includes(o.status) ? ' Ya podés coordinar el retiro/entrega con nosotros.' : o.estimated ? ` Entrega estimada: ${fmtDay(o.estimated)}.` : '')

  return (
    <>
      <h2>Pedidos</h2>
      {error && <p className="alert">{error}</p>}
      <div className="chips">
        {[['activos', 'En curso'], ['todos', 'Todos'], ...STATUSES.map((s) => [s.key, s.label])].map(([k, l]) => (
          <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
            {l}{k !== 'todos' && k !== 'activos' && orders ? ` (${orders.filter((o) => o.status === k).length})` : ''}
          </button>
        ))}
      </div>
      {!orders && <p className="muted">Cargando…</p>}
      {shown?.length === 0 && <p className="muted">No hay pedidos en esta vista.</p>}

      <div className="orders-layout">
        <div className="item-list">
          {shown?.map((o) => (
            <button key={o.id} className={'order-row' + (o.id === open ? ' sel' : '')} onClick={() => setParams({ open: o.id })}>
              <div><b>N° {o.number}</b> · {o.customerName}<br /><span className="muted small">{fmtDate(o.createdAt)} · entrega {fmtDay(o.estimated)}</span></div>
              <div style={{ textAlign: 'right' }}><StatusBadge status={o.status} /><br /><b>{fmtMoney(o.total)}</b></div>
            </button>
          ))}
        </div>

        {sel && (
          <aside className="panel order-detail">
            <div className="row between"><h3>Pedido N° {sel.number}</h3><button className="link muted" onClick={() => setParams({})}>Cerrar ✕</button></div>
            <p><b>{sel.customerName}</b><br />
              <a href={`https://wa.me/${waNumber(sel.phone)}`} target="_blank" rel="noreferrer">{sel.phone} (WhatsApp)</a></p>
            {sel.notes && <p className="muted small">📝 {sel.notes}</p>}
            <ul className="plain">
              {sel.items.map((i, k) => <li key={k}>{i.qty} × <b>{i.name} {i.label}</b> <span className="muted">— {fmtMoney(i.price * i.qty)}</span></li>)}
            </ul>
            <p><b>Total {fmtMoney(sel.total)}</b></p>
            <Progress status={sel.status} />

            <label>Etapa
              <select value={sel.status} onChange={(e) => patch(sel, { status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
            <div className="row">
              {(() => {
                const idx = STATUSES.findIndex((s) => s.key === sel.status)
                const next = STATUSES[idx + 1]
                return next && next.key !== 'cancelado' && sel.status !== 'cancelado'
                  ? <button className="btn" onClick={() => patch(sel, { status: next.key })}>Pasar a «{next.label}» →</button> : null
              })()}
              <a className="btn wa" style={{ width: 'auto' }} href={`https://wa.me/${waNumber(sel.phone)}?text=${encodeURIComponent(msgFor(sel))}`} target="_blank" rel="noreferrer">
                Avisar al cliente
              </a>
            </div>
            <label>Fecha estimada de entrega
              <input type="date" value={sel.estimated ?? ''} onChange={(e) => patch(sel, { estimated: e.target.value })} />
            </label>
            <label>Notas internas
              <textarea rows={2} defaultValue={sel.staffNotes} onBlur={(e) => e.target.value !== sel.staffNotes && patch(sel, { staffNotes: e.target.value })} placeholder="Ej: falta comprar cierres" />
            </label>
            <details>
              <summary className="muted small">Historial de etapas</summary>
              <ul className="plain small">
                {sel.log.map((l, k) => <li key={k}>{fmtDate(l.at)} — {statusOf(l.status).label}</li>)}
              </ul>
            </details>
            {sel.status === 'cancelado' && <p className="muted small">Al cancelar, el stock de los productos vuelve al inventario.</p>}
          </aside>
        )}
      </div>
    </>
  )
}
