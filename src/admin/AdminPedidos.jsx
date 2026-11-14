import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listOrders, updateOrder } from '../lib/data'
import { useSettings } from '../lib/settings'
import { fmtMoney, fmtDate } from '../lib/format'
import { fmtDay, waNumber } from '../lib/orders'
import { useStatuses } from '../lib/statuses'
import { useConfirm } from '../components/Confirm'
import { StatusBadge, Progress } from '../pages/MisPedidos'

export default function AdminPedidos() {
  const [orders, setOrders] = useState(null)
  const [filter, setFilter] = useState('activos')
  const [params, setParams] = useSearchParams()
  const open = params.get('open')
  const [error, setError] = useState('')
  const { settings } = useSettings()
  const { all, active, statusOf, inProgressKeys } = useStatuses()
  const ask = useConfirm()
  const load = () => listOrders().then(setOrders).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const shown = orders?.filter((o) => filter === 'todos' ? true : filter === 'activos' ? inProgressKeys.includes(o.status) : o.status === filter)
  const sel = orders?.find((o) => o.id === open)
  const count = (k) => orders?.filter((o) => o.status === k).length ?? 0
  // chips: los estados activos y, si quedaron pedidos en uno desactivado, también ese
  const chipStatuses = all.filter((s) => s.active || count(s.key) > 0)

  const patch = async (o, p, confirmOpts) => {
    setError('')
    if (confirmOpts && !(await ask.custom(confirmOpts))) return false
    try { await updateOrder(o.id, p); await load(); return true } catch (e) { setError(e.message); return false }
  }
  const changeStatus = (o, key) => {
    if (key === o.status) return
    const to = statusOf(key)
    return patch(o, { status: key }, {
      title: 'Confirmar cambio de estado',
      message: `¿Pasar el pedido N° ${o.number} de «${statusOf(o.status).label}» a «${to.label}»?`,
      lines: key === 'cancelado' ? ['Al cancelar, el stock de los productos vuelve al inventario.'] : o.status === 'cancelado' ? ['Al reactivar un pedido cancelado, el stock se descuenta de nuevo.'] : undefined,
      confirmText: 'Sí, cambiar', danger: key === 'cancelado'
    })
  }
  const msgFor = (o) =>
    `Hola ${o.customerName.split(' ')[0]}! Tu pedido N° ${o.number} de ${settings.storeName} está: ${statusOf(o.status).label}.` +
    (['listo'].includes(o.status) ? ' Ya podés coordinar el retiro/entrega con nosotros.' : o.estimated ? ` Entrega estimada: ${fmtDay(o.estimated)}.` : '')

  return (
    <>
      <h2>Pedidos</h2>
      {error && <p className="alert">{error}</p>}
      <div className="chips">
        {[['activos', 'En curso'], ['todos', 'Todos'], ...chipStatuses.map((s) => [s.key, s.label])].map(([k, l]) => (
          <button key={k} className={'chip' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>
            {l}{k !== 'todos' && k !== 'activos' && orders ? ` (${count(k)})` : ''}
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
          <OrderDetail key={sel.id} o={sel} active={active} statusOf={statusOf} msg={msgFor(sel)}
            onClose={() => setParams({})} changeStatus={changeStatus}
            saveDate={(date) => patch(sel, { estimated: date }, { title: 'Confirmar modificación', message: `¿Cambiar la fecha estimada de entrega del pedido N° ${sel.number} a ${date ? fmtDay(date) : 'sin fecha'}?`, confirmText: 'Sí, guardar' })}
            saveNotes={(txt) => patch(sel, { staffNotes: txt }, { title: 'Confirmar modificación', message: `¿Guardar las notas internas del pedido N° ${sel.number}?`, confirmText: 'Sí, guardar' })} />
        )}
      </div>
    </>
  )
}

function OrderDetail({ o, active, statusOf, msg, onClose, changeStatus, saveDate, saveNotes }) {
  const [date, setDate] = useState(o.estimated ?? '')
  const [notes, setNotes] = useState(o.staffNotes ?? '')
  useEffect(() => { setDate(o.estimated ?? ''); setNotes(o.staffNotes ?? '') }, [o.estimated, o.staffNotes])

  // la lista del desplegable: estados activos (y el actual aunque se haya desactivado)
  const options = active.some((s) => s.key === o.status) ? active : [...active, statusOf(o.status)]
  const flow = active.filter((s) => s.key !== 'cancelado')
  const idx = flow.findIndex((s) => s.key === o.status)
  const next = o.status !== 'cancelado' ? flow[idx + 1] : null

  return (
    <aside className="panel order-detail">
      <div className="row between"><h3>Pedido N° {o.number}</h3><button className="link muted" onClick={onClose}>Cerrar ✕</button></div>
      <p><b>{o.customerName}</b><br />
        <a href={`https://wa.me/${waNumber(o.phone)}`} target="_blank" rel="noreferrer">{o.phone} (WhatsApp)</a></p>
      {o.notes && <p className="muted small">📝 {o.notes}</p>}
      <ul className="plain">
        {o.items.map((i, k) => <li key={k}>{i.qty} × <b>{i.name} {i.label}</b> <span className="muted">— {fmtMoney(i.price * i.qty)}</span></li>)}
      </ul>
      <p><b>Total {fmtMoney(o.total)}</b></p>
      <Progress status={o.status} />

      <label>Estado del pedido
        <select value={o.status} onChange={(e) => changeStatus(o, e.target.value)}>
          {options.map((s) => <option key={s.key} value={s.key}>{s.label}{s.active === false ? ' (desactivado)' : ''}</option>)}
        </select>
      </label>
      <div className="row">
        {next && <button className="btn" onClick={() => changeStatus(o, next.key)}>Pasar a «{next.label}» →</button>}
        <a className="btn wa" style={{ width: 'auto' }} href={`https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
          Avisar al cliente
        </a>
      </div>
      <label>Fecha estimada de entrega
        <div className="row">
          <input style={{ flex: 1 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="btn ghost" disabled={date === (o.estimated ?? '')} onClick={() => saveDate(date)}>Guardar fecha</button>
        </div>
      </label>
      <label>Notas internas
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: falta comprar cierres" />
        <button type="button" className="btn ghost" style={{ justifySelf: 'start' }} disabled={notes === (o.staffNotes ?? '')} onClick={() => saveNotes(notes)}>Guardar notas</button>
      </label>
      <details>
        <summary className="muted small">Historial de etapas</summary>
        <ul className="plain small">
          {o.log.map((l, k) => <li key={k}>{fmtDate(l.at)} — {statusOf(l.status).label}</li>)}
        </ul>
      </details>
      {o.status === 'cancelado' && <p className="muted small">Al cancelar, el stock de los productos vuelve al inventario.</p>}
    </aside>
  )
}
