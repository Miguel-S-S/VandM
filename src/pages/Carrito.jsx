import { Link } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { useSettings } from '../lib/settings'
import { fmtMoney } from '../lib/format'
import { Photo } from '../components/ProductCard'

export default function Carrito() {
  const { items, setQty, remove, clear, total } = useCart()
  const { settings } = useSettings()

  if (!items.length) {
    return (
      <div className="center empty">
        <h2>Tu carrito está vacío</h2>
        <Link to="/" className="btn">Ver productos</Link>
      </div>
    )
  }

  // Etapa 1: el pedido se envía por WhatsApp. En la etapa 2 se guardará en la base de datos.
  const message = () => {
    const lines = items.map((i) => `• ${i.qty} x ${i.name} ${i.label} — ${fmtMoney(i.price * i.qty)}`)
    return encodeURIComponent(
      `Hola! Quiero hacer este pedido en ${settings.storeName}:\n\n${lines.join('\n')}\n\nTotal: ${fmtMoney(total)}\n${settings.deliveryText}`
    )
  }
  const wa = settings.whatsapp ? `https://wa.me/${settings.whatsapp}?text=${message()}` : null

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

      <div className="summary">
        <div className="row"><span>Total</span><b className="price big">{fmtMoney(total)}</b></div>
        <p className="muted small">🚚 {settings.deliveryText}</p>
        {wa
          ? <a className="btn wa" href={wa} target="_blank" rel="noreferrer">Enviar pedido por WhatsApp</a>
          : <p className="alert">Configurá el número de WhatsApp en Panel → Apariencia para habilitar el envío del pedido.</p>}
        <button className="link danger" onClick={clear}>Vaciar carrito</button>
      </div>
    </div>
  )
}
