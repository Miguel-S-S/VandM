import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listProducts, listCategories } from '../lib/data'
import { useSettings } from '../lib/settings'
import ProductCard from '../components/ProductCard'
import ProductCarousel from '../components/ProductCarousel'
import { hasPromo } from '../lib/pricing'

export default function Tienda() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') || 'todos'
  const [products, setProducts] = useState(null)
  const [cats, setCats] = useState([])
  const [error, setError] = useState('')
  const { settings } = useSettings()

  useEffect(() => {
    Promise.all([listProducts(), listCategories()])
      .then(([p, c]) => { setProducts(p.filter((x) => x.active)); setCats(c) })
      .catch((e) => setError(e.message))
  }, [])

  const matches = (p) => cat === 'todos' || (cat === 'ofertas' ? hasPromo(p) : cat === 'combos' ? p.isCombo : p.category === cat)
  const shown = products?.filter(matches)
  // carrusel: todos los productos y combos (primero combos y ofertas, al final los sin stock); al tocar uno lleva a su categoría
  const inStock = (p) => p.variants.some((v) => v.active && v.stock > 0)
  const rank = (p) => (inStock(p) ? (p.isCombo ? 0 : hasPromo(p) ? 1 : 2) : 3)
  const spotlight = [...(products ?? [])].sort((a, b) => rank(a) - rank(b))
  const chips = [{ slug: 'todos', name: 'Todos' }, ...cats,
    ...(products?.some(hasPromo) ? [{ slug: 'ofertas', name: '🔥 Ofertas', promo: true }] : []),
    ...(products?.some((p) => p.isCombo) && !cats.some((c) => c.slug === 'combos') ? [{ slug: 'combos', name: 'Combos', promo: true }] : [])]

  return (
    <>
      <section className="hero">
        <img src="/logo.jpg" alt="V&M Artículos deportivos" className="hero-logo" />
        <div>
          <h1>{settings.storeName}</h1>
          <p>{settings.tagline}</p>
          <p className="delivery">🚚 {settings.deliveryText}</p>
        </div>
      </section>

      {cat === 'todos' && <ProductCarousel title="Productos y combos" products={spotlight} />}

      <div className="chips" role="tablist">
        {chips.map((c) => (
          <button key={c.slug} className={'chip' + (cat === c.slug ? ' on' : '') + (c.promo ? ' promo' : '')}
            onClick={() => setParams(c.slug === 'todos' ? {} : { cat: c.slug })}>{c.name}</button>
        ))}
      </div>

      {error && <p className="alert">No se pudieron cargar los productos: {error}</p>}
      {!products && !error && <p className="muted center">Cargando…</p>}
      {shown && shown.length === 0 && <p className="muted center">Todavía no hay productos en esta categoría.</p>}
      <div className="grid">{shown?.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </>
  )
}