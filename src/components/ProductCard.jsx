import { useState } from 'react'
import { coverOf, isIg } from '../lib/images'
import { Link } from 'react-router-dom'
import { fmtMoney } from '../lib/format'

export function Photo({ src, alt }) {
  const [broken, setBroken] = useState(false)
  return src && !isIg(src) && !broken
    ? <img src={src} alt={alt} loading="lazy" className="photo" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
    : <div className="photo photo-empty"><img src="/logo.jpg" alt="V&M" /></div>
}

export default function ProductCard({ p }) {
  const vs = p.variants.filter((v) => v.active)
  const prices = vs.map((v) => v.price)
  const from = prices.length ? Math.min(...prices) : null
  const soldOut = vs.length > 0 && vs.every((v) => v.stock <= 0)
  return (
    <Link to={`/producto/${p.id}`} className="card">
      <div className="card-img">
        <Photo src={coverOf(p.images)} alt={p.name} />
        {p.featured && <span className="tag">Destacado</span>}
        {soldOut && <span className="tag tag-red">Sin stock</span>}
      </div>
      <div className="card-body">
        <h3>{p.name}</h3>
        {vs.length > 0 && (
          <p className="muted small">{vs[0].label} a {vs[vs.length - 1].label}</p>
        )}
        <p className="price">{from != null ? <>Desde <b>{fmtMoney(from)}</b></> : 'Consultar'}</p>
      </div>
    </Link>
  )
}
