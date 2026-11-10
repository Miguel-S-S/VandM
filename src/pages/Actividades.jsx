import { Link } from 'react-router-dom'
import { ACTIVITIES, DEMO_CATEGORIES } from '../lib/demoData'

// Etapa 1: contenido de ejemplo. Cada actividad enlaza con la sección de la tienda del producto recomendado.
export default function Actividades() {
  const catName = (slug) => DEMO_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug
  return (
    <>
      <h1>Actividades</h1>
      <p className="muted">Ejercicios que podés hacer con nuestros productos. Tocá una actividad para ir al equipamiento recomendado.</p>
      <div className="grid wide">
        {ACTIVITIES.map((a) => (
          <article key={a.id} className="panel activity">
            <span className="tag static">{catName(a.category)}</span>
            <h3>{a.title}</h3>
            <p className="muted">{a.desc}</p>
            <p className="small">⏱ {a.minutes} min · Nivel {a.level.toLowerCase()}</p>
            <p className="small"><b>Recomendado:</b> {a.recommend}</p>
            <Link className="btn ghost" to={`/?cat=${a.category}`}>Ver {catName(a.category).toLowerCase()} →</Link>
          </article>
        ))}
      </div>
    </>
  )
}
