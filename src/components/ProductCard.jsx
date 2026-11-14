import { useState } from 'react'
import { coverOf, isIg, isYt, ytThumb } from '../lib/images'
import { Link } from 'react-router-dom'
import { fmtMoney } from '../lib/format'
import { onPromo, bestPct, promoLabelOf } from '../lib/pricing'

export function Photo({ src, alt }) {
  const [broken, setBroken] = useState(false)
  const real = isYt(src) ? ytThumb(src) : src
  return real && !isIg(real) && !broken
    ? <img src={real} alt={alt} loading="lazy" className="photo" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
    : <div className="photo photo-empty"><img src="/logo.jpg" alt="V&M" /></div>
}

// Precio "desde" de un producto, con el precio normal tachado si esa variante está en promoción
export function fromPrice(p) {
  const vs = p.variants.filter((v) => v.active)
  if (!vs.length) return null
  const v = vs.reduce((a, b) => (b.price < a.price ? b : a))
  return { price: v.price, was: onPromo(v) ? v.listPrice : null }
}

export function Badges({ p }) {
  const vs = p.variants.filter((v) => v.active)
  const soldOut = vs.length > 0 && vs.every((v) => v.stock <= 0)
  const pct = bestPct(p)
  return (
    <>
      {p.isCombo ? <span className="tag tag-combo">Combo</span> : pct > 0 ? <span className="tag">{promoLabelOf(p)}</span> : p.featured && <span className="tag">Destacado</span>}
      {soldOut ? <span className="tag tag-red">Sin stock</span> : pct > 0 && <span className="tag tag-red">-{pct}%</span>}
    </>
  )
}

export default function ProductCard({ p }) {
  const vs = p.variants.filter((v) => v.active)
  const from = fromPrice(p)
  return (
    <Link to={`/producto/${p.id}`} className="card">
      <div className="card-img">
        <Photo src={coverOf(p.images)} alt={p.name} />
        <Badges p={p} />
      </div>
      <div className="card-body">
        <h3>{p.name}</h3>
        {p.isCombo
          ? <p className="muted small">{(p.comboItems ?? []).map((i) => `${i.qty}× ${i.name} ${i.label}`).join(' + ') || 'Pack de artículos'}</p>
          : vs.length > 0 && <p className="muted small">{vs[0].label} a {vs[vs.length - 1].label}</p>}
        <p className="price">{from ? <>{p.isCombo ? '' : 'Desde '}<b>{fmtMoney(from.price)}</b>{from.was && <span className="price-old">{fmtMoney(from.was)}</span>}</> : 'Consultar'}</p>
      </div>
    </Link>
  )
}
