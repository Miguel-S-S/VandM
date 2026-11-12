import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivities, listCategories } from '../lib/data'

export default function Actividades() {
  const [acts, setActs] = useState(null)
  const [cats, setCats] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([listActivities(), listCategories()])
      .then(([a, c]) => { setActs(a.filter((x) => x.published)); setCats(c) })
      .catch((e) => setError(e.message))
  }, [])
  const catName = (slug) => cats.find((c) => c.slug === slug)?.name ?? slug

  return (
    <>
      <h1>Actividades</h1>
      <p className="muted">Ejercicios que podés hacer con nuestros productos. Tocá “Ver productos” para ir directo al equipamiento recomendado.</p>
      {error && <p className="alert">{error}</p>}
      {acts?.length === 0 && <p className="muted center">Pronto vamos a sumar actividades.</p>}
      <div className="grid wide">
        {acts?.map((a) => (
          <article key={a.id} className="panel activity">
            {a.image && <img className="news-img" src={a.image} alt={a.title} loading="lazy" />}
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
