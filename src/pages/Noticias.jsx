import { useEffect, useState } from 'react'
import { listNews } from '../lib/data'

export default function Noticias() {
  const [news, setNews] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { listNews().then((n) => setNews(n.filter((x) => x.published))).catch((e) => setError(e.message)) }, [])
  return (
    <>
      <h1>Noticias y eventos</h1>
      <p className="muted">Novedades del mundo del crossfit y los eventos deportivos.</p>
      {error && <p className="alert">{error}</p>}
      {news?.length === 0 && <p className="muted center">Todavía no hay noticias.</p>}
      <div className="stack">
        {news?.map((n) => (
          <article key={n.id} className="panel">
            <span className="tag static">{n.tag}</span>
            {n.date && <small className="muted"> {new Date(n.date + 'T12:00:00').toLocaleDateString('es-AR', { dateStyle: 'long' })}</small>}
            <h3>{n.title}</h3>
            {n.image && <img className="news-img" src={n.image} alt={n.title} loading="lazy" />}
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>{n.body}</p>
          </article>
        ))}
      </div>
    </>
  )
}
