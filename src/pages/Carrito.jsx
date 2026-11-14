import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { useSettings } from '../lib/settings'
import { useAuth } from '../lib/auth'
import { createOrder } from '../lib/data'
import { fmtMoney } from '../lib/format'
import { normalizePhone } from '../lib/phone'
import { Photo } from '../components/ProductCard'

export default function Carrito() {
  const { items, setQty, remove, clear, total } = useCart()
  const { settings } = useSettings()
  const { user, isVerified } = useAuth()
  const nav = useNavigate()
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!items.length) {
    return (
      <div className="center empty">
        <h2>Tu carrito está vacío</h2>
        <Link to="/" className="btn">Ver productos</Link>
        {user && <Link to="/mis-pedidos" className="link">Ver mis pedidos</Link>}
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!user) return nav('/ingresar?next=/carrito')
    if (!isVerified) return nav('/verificar?next=/carrito')
    setBusy(true); setError('')
    try {
      const order = await createOrder({ name: user.name, phone: user.phone, notes: notes.trim(), items })
      clear()
      nav('/pedido-confirmado', { state: { order }, replace: true })
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <div className="cart">
      <h1>Carrito</h1>
      <ul className="cart-list">
        {items.map((i) => (
          <li key={i.variantId}>
            <div className="cart-img"><Photo src={i.image} alt={i.name} /></div>
            <div className="cart-info">
              <b>{i.name}</b>
              <span className="muted">{i.label} · {fmtMoney(i.price)} c/u{i.listPrice && <span className="price-old">{fmtMoney(i.listPrice)}</span>}</span>
              <div className="qty sm">
                <button onClick={() => setQty(i.variantId, i.qty - 1)}>−</button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.variantId, i.qty + 1)}>+</button>
              </div>
            </div>
            <div className="cart-sub">
              <b>{fmtMoney(i.price * i.qty)}</b>
              <button className="link danger" onClick={() => remove(i.variantId)}>Quitar</button>
            </div>
          </li>
        ))}
      </ul>

      <form className="summary" onSubmit={submit}>
        <div className="row between"><span>Total</span><b className="price big">{fmtMoney(total)}</b></div>
        <p className="muted small">🚚 {settings.deliveryText}</p>
        {!user && <p className="alert">Para confirmar el pedido tenés que ingresar a tu cuenta.</p>}
        {user && !isVerified && <p className="alert">Falta verificar tu número de teléfono para poder comprar.</p>}
        {user && (
          <p className="small">Pedido a nombre de <b>{user.name}</b>{user.phone && <> · WhatsApp {normalizePhone(user.phone).pretty ?? user.phone}</>}</p>
        )}
        <label>Aclaraciones (opcional)<textarea rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Color, forma de entrega, etc." /></label>
        {error && <p className="alert">{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? 'Enviando…' : !user ? 'Ingresar para confirmar' : !isVerified ? 'Verificar mi número' : 'Confirmar pedido'}
        </button>
        <p className="muted small">Al confirmar se registra tu pedido y te damos el número para avisarnos por WhatsApp. El pago se coordina con nosotros.</p>
        <button type="button" className="link danger" onClick={clear}>Vaciar carrito</button>
      </form>
    </div>
  )
}
