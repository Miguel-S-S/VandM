import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Media from '../components/Media'
import { listActivities, listCategories, listProducts } from '../lib/data'

export default function Actividades() {
  const [params] = useSearchParams()
  const ids = useMemo(() => (params.get('producto') ?? '').split(',').filter(Boolean), [params])
  const highlight = params.get('act')
  const [acts, setActs] = useState(null)
  const [cats, setCats] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([listActivities(), listCategories(), listProducts()])
      .then(([a, c, p]) => { setActs(a.filter((x) => x.published)); setCats(c); setProducts(p) })
      .catch((e) => setError(e.message))
  }, [])
  const catName = (slug) => cats.find((c) => c.slug === slug)?.name ?? slug

  // si se llegó desde un producto: primero las actividades de ese artículo, y después las de su categoría
  const picked = products.filter((p) => ids.includes(p.id))
  const catSet = new Set(picked.filter((p) => !p.isCombo).map((p) => p.category).filter(Boolean))
  const isMine = (a) => (a.productId && ids.includes(a.productId)) || (!a.productId && a.category && catSet.has(a.category))
  const filtered = ids.length > 0
  const list = useMemo(() => {
    if (!acts) return null
    if (!filtered) return acts
    return [...acts.filter((a) => a.productId && ids.includes(a.productId)), ...acts.filter((a) => !a.productId && isMine(a))]
  }, [acts, filtered, ids, products]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!list || !highlight) return
    document.getElementById('act-' + highlight)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [list, highlight])

  return (
    <>
      <h1>Actividades</h1>
      {filtered ? (
        <div className="banner">
          <span>Ejercicios con <b>{picked.map((p) => p.name).join(' + ') || 'el artículo elegido'}</b></span>
          <Link to="/actividades" className="link">Ver todas las actividades</Link>
        </div>
      ) : (
        <p className="muted">Ejercicios que podés hacer con nuestros productos. Tocá “Ver productos” para ir directo al equipamiento recomendado.</p>
      )}
      {error && <p className="alert">{error}</p>}
      {list?.length === 0 && (
        <p className="muted center">{filtered ? 'Todavía no cargamos ejercicios para este artículo.' : 'Pronto vamos a sumar actividades.'}</p>
      )}
      <div className="grid wide">
        {list?.map((a) => (
          <article key={a.id} id={'act-' + a.id} className={'panel activity' + (a.id === highlight ? ' hl' : '')}>
            <Media src={a.image} alt={a.title} />
            {a.category && <span className="tag static">{catName(a.category)}</span>}
            <h3>{a.title}</h3>
            <p className="muted">{a.description}</p>
            <p className="small">{a.minutes ? `⏱ ${a.minutes} min · ` : ''}Nivel {a.level.toLowerCase()}</p>
            {a.recommend && <p className="small"><b>Recomendado:</b> {a.recommend}</p>}
            {(a.productId || a.category) && (
              <Link className="btn ghost" to={a.productId ? `/producto/${a.productId}` : `/?cat=${a.category}`}>
                {a.productId ? `Ver ${a.productName ?? 'producto'} →` : `Ver ${catName(a.category).toLowerCase()} →`}
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
