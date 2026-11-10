import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listProducts, listCategories } from '../lib/data'
import { useSettings } from '../lib/settings'
import ProductCard from '../components/ProductCard'

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

  const shown = products?.filter((p) => cat === 'todos' || p.category === cat)

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

      <div className="chips" role="tablist">
        {[{ slug: 'todos', name: 'Todos' }, ...cats].map((c) => (
          <button key={c.slug} className={'chip' + (cat === c.slug ? ' on' : '')}
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
