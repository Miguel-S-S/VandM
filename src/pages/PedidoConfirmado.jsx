import { Link, Navigate, useLocation } from 'react-router-dom'
import { useSettings } from '../lib/settings'
import { fmtMoney } from '../lib/format'
import { fmtDay } from '../lib/orders'

export default function PedidoConfirmado() {
  const { state } = useLocation()
  const { settings } = useSettings()
  const o = state?.order
  if (!o) return <Navigate to="/" replace />

  const text = encodeURIComponent(
    `Hola! Hice el pedido N° ${o.number} en ${settings.storeName}.\n\n` +
    o.items.map((i) => `• ${i.qty} x ${i.name} ${i.label} — ${fmtMoney(i.price * i.qty)}`).join('\n') +
    `\n\nTotal: ${fmtMoney(o.total)}\nEntrega estimada: ${fmtDay(o.estimated)}\nA nombre de: ${o.customerName}`
  )
  const wa = settings.whatsapp ? `https://wa.me/${settings.whatsapp}?text=${text}` : null

  return (
    <div className="panel narrow-box center">
      <div style={{ fontSize: '3rem' }}>✅</div>
      <h1>¡Pedido recibido!</h1>
      <p>Pedido N° <b className="price">{o.number}</b></p>
      <p className="muted">Total {fmtMoney(o.total)} · Fecha estimada de entrega: <b>{fmtDay(o.estimated)}</b></p>
      <p className="muted small">Los productos se confeccionan a pedido. Te avisamos cuando esté listo.</p>
      {wa
        ? <a className="btn wa" href={wa} target="_blank" rel="noreferrer">Avisar por WhatsApp</a>
        : <p className="muted small">Guardá tu número de pedido y contactanos por redes sociales.</p>}
      <Link to="/" className="link">Seguir comprando</Link>
    </div>
  )
}
