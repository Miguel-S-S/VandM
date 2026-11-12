import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { useSettings } from '../lib/settings'
import { useAuth } from '../lib/auth'
import { createOrder } from '../lib/data'
import { fmtMoney } from '../lib/format'
import { Photo } from '../components/ProductCard'

export default function Carrito() {
  const { items, setQty, remove, clear, total } = useCart()
  const { settings } = useSettings()
  const { user } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState(() => ({
    name: localStorage.getItem('vm_cust_name') || '', phone: localStorage.getItem('vm_cust_phone') || '', notes: ''
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

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
    e.preventDefault(); setBusy(true); setError('')
    try {
      const order = await createOrder({ name: f.name, phone: f.phone, notes: f.notes, items })
      localStorage.setItem('vm_cust_name', f.name); localStorage.setItem('vm_cust_phone', f.phone)
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
              <span className="muted">{i.label} · {fmtMoney(i.price)} c/u</span>
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
        <label>Nombre y apellido<input value={f.name} onChange={set('name')} required autoComplete="name" /></label>
        <label>Teléfono / WhatsApp<input value={f.phone} onChange={set('phone')} required inputMode="tel" autoComplete="tel" placeholder="Ej: 3794 123456" /></label>
        <label>Aclaraciones (opcional)<textarea rows={2} value={f.notes} onChange={set('notes')} placeholder="Color, forma de entrega, etc." /></label>
        {error && <p className="alert">{error}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Enviando…' : 'Confirmar pedido'}</button>
        <p className="muted small">Al confirmar se registra tu pedido y te damos el número para avisarnos por WhatsApp. El pago se coordina con nosotros.</p>
        <button type="button" className="link danger" onClick={clear}>Vaciar carrito</button>
      </form>
    </div>
  )
}
