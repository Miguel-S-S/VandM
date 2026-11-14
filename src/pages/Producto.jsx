import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getProduct, listActivities } from '../lib/data'
import { useCart } from '../lib/cart'
import { useSettings } from '../lib/settings'
import { useAuth } from '../lib/auth'
import { fmtMoney } from '../lib/format'
import { Photo } from '../components/ProductCard'
import { photosOf, igOf, ytOf, igPostUrl } from '../lib/images'
import { IgFrame, YtFrame } from '../components/Media'
import { onPromo, pctOff } from '../lib/pricing'
import { relatedActivities, activitiesLink } from '../lib/related'

export default function Producto() {
  const { id } = useParams()
  const nav = useNavigate()
  const { add } = useCart()
  const { user } = useAuth()
  const { settings } = useSettings()
  const [p, setP] = useState(undefined)
  const [sel, setSel] = useState(null)
  const [img, setImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [acts, setActs] = useState([])

  useEffect(() => {
    getProduct(id).then((x) => {
      setP(x)
      const first = x?.variants.find((v) => v.active && v.stock > 0) ?? x?.variants[0]
      setSel(first?.id ?? null)
    })
  }, [id])
  // ejercicios que usan este artículo (o, si es combo, los artículos que trae)
  useEffect(() => {
    if (!p) return
    listActivities().then((a) => setActs(relatedActivities(a.filter((x) => x.published), p))).catch(() => setActs([]))
  }, [p])

  if (p === undefined) return <p className="muted center">Cargando…</p>
  if (p === null) return <p className="center">Producto no encontrado. <Link to="/">Volver a la tienda</Link></p>

  const photos = photosOf(p.images)
  const igs = igOf(p.images)
  const yts = ytOf(p.images)
  const variants = p.variants.filter((v) => v.active)
  const v = variants.find((x) => x.id === sel)

  return (
    <div className="detail">
      <Link to="/" className="back">← Tienda</Link>
      <div className="detail-grid">
        <div>
          <div className="detail-img"><Photo src={photos[img]} alt={p.name} /></div>
          {photos.length > 1 && (
            <div className="thumbs">
              {photos.map((src, i) => (
                <button key={i} className={i === img ? 'on' : ''} onClick={() => setImg(i)}><img src={src} alt="" /></button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">{p.categoryName ?? p.category}</p>
          <h1>{p.name}</h1>
          <p className="price big">
            {v ? fmtMoney(v.price) : 'Consultar'}
            {v && onPromo(v) && <><span className="price-old">{fmtMoney(v.listPrice)}</span> <span className="pill" style={{ background: 'var(--danger)', color: '#fff' }}>-{pctOff(v)}%</span></>}
          </p>
          {v && onPromo(v) && (v.promoLabel || v.promoEnds) && (
            <p className="small" style={{ color: 'var(--danger)' }}>
              {v.promoLabel}{v.promoLabel && v.promoEnds ? ' · ' : ''}{v.promoEnds && `válida hasta el ${new Date(v.promoEnds.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-AR')}`}
            </p>
          )}
          <p className="muted">{p.description}</p>

          {p.isCombo && (p.comboItems ?? []).length > 0 && (
            <div className="combo-includes">
              <b>Este combo incluye:</b>
              <ul>
                {p.comboItems.map((i, k) => <li key={k}>{i.qty} × <Link to={`/producto/${i.productId}`}>{i.name} {i.label}</Link></li>)}
              </ul>
              {onPromo(v) && <p className="small" style={{ margin: '.5rem 0 0' }}>Comprados por separado: <b>{fmtMoney(v.listPrice)}</b> · ahorrás <b>{fmtMoney(v.listPrice - v.price)}</b></p>}
            </div>
          )}

          {!p.isCombo && <h4>Peso</h4>}
          <div className="variants" style={p.isCombo ? { display: 'none' } : undefined}>
            {variants.map((x) => (
              <button key={x.id} disabled={x.stock <= 0} className={'variant' + (x.id === sel ? ' on' : '')}
                onClick={() => { setSel(x.id); setQty(1) }}>
                {x.label}
                {x.stock > 0 && onPromo(x) && <small style={{ color: 'var(--danger)' }}>-{pctOff(x)}%</small>}
                {x.stock <= 0 && <small>sin stock</small>}
              </button>
            ))}
          </div>

          {v && (
            <p className="small muted">
              {v.stock > 0 ? `${v.stock} disponible${v.stock > 1 ? 's' : ''}` : 'Sin stock'}
            </p>
          )}
          <p className="delivery">🚚 {settings.deliveryText}</p>

          <div className="buy-row">
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(v?.stock ?? 1, q + 1))}>+</button>
            </div>
            {user ? (
              <button className="btn" disabled={!v || v.stock <= 0}
                onClick={() => { add(p, v, qty); setAdded(true); setTimeout(() => setAdded(false), 1800) }}>
                {added ? '¡Agregado ✓' : 'Agregar al carrito'}
              </button>
            ) : (
              <button className="btn" onClick={() => nav(`/ingresar?next=${encodeURIComponent('/producto/' + p.id)}`)}>
                Ingresá para comprar
              </button>
            )}
          </div>
          {added && <button className="btn ghost" onClick={() => nav('/carrito')}>Ir al carrito</button>}

          {yts.length > 0 && (
            <div className="ig-embeds">
              <h4>Videos</h4>
              {yts.map((g) => <div key={g} className="ig-item"><YtFrame src={g} /></div>)}
            </div>
          )}
          {igs.length > 0 && (
            <div className="ig-embeds">
              <h4>Mirá en Instagram</h4>
              {igs.map((g) => (
                <div key={g} className="ig-item">
                  <IgFrame src={g} />
                  <a href={igPostUrl(g)} target="_blank" rel="noreferrer" className="small">Ver en Instagram ↗</a>
                </div>
              ))}
            </div>
          )}
          {acts.length > 0 && (
            <div className="rel-acts">
              <h4 style={{ margin: 0 }}>Ejercicios con {p.isCombo ? 'este combo' : 'este artículo'}</h4>
              {acts.slice(0, 3).map((a) => (
                <Link key={a.id} className="rel-act" to={activitiesLink(p, a.id)}>
                  <span style={{ fontSize: '1.4rem' }}>💪</span>
                  <span><b>{a.title}</b><small>{[a.level, a.minutes && `${a.minutes} min`].filter(Boolean).join(' · ')}</small></span>
                </Link>
              ))}
            </div>
          )}
          <Link to={acts.length > 0 ? activitiesLink(p) : '/actividades'} className="link-box">
            💪 {acts.length > 0
              ? `Ver ${acts.length === 1 ? 'el ejercicio recomendado' : `los ${acts.length} ejercicios recomendados`} →`
              : `¿Cómo usar ${p.name.toLowerCase()}? Ver ejercicios recomendados →`}
          </Link>
        </div>
      </div>
    </div>
  )
}
