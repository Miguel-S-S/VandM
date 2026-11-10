import { NEWS } from '../lib/demoData'

export default function Noticias() {
  return (
    <>
      <h1>Noticias y eventos</h1>
      <p className="muted">Novedades del mundo del crossfit y los eventos deportivos.</p>
      <div className="stack">
        {NEWS.map((n) => (
          <article key={n.id} className="panel">
            <span className="tag static">{n.tag}</span>
            <small className="muted"> {new Date(n.date + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'long' })}</small>
            <h3>{n.title}</h3>
            <p className="muted">{n.body}</p>
          </article>
        ))}
      </div>
    </>
  )
}
