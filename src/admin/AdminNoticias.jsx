import { useEffect, useState } from 'react'
import { listNews, saveNews, deleteNews } from '../lib/data'
import ImageField from '../components/ImageField'
import { Photo } from '../components/ProductCard'

const EMPTY = { title: '', body: '', tag: 'Evento', date: '', image: '', published: true }
const TAGS = ['Evento', 'Noticia', 'Competencia', 'Promoción']

export default function AdminNoticias() {
  const [list, setList] = useState(null)
  const [f, setF] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => listNews().then(setList).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await saveNews(f); setF(null); await load() } catch (err) { setError(err.message) }
    setBusy(false)
  }
  const del = async (n) => {
    if (!confirm(`¿Eliminar "${n.title}"?`)) return
    try { await deleteNews(n.id); load() } catch (e) { setError(e.message) }
  }

  if (f) return (
    <form className="form" onSubmit={submit}>
      <h2>{f.id ? 'Editar noticia' : 'Nueva noticia o evento'}</h2>
      <div className="panel form-grid">
        <label className="full">Título<input value={f.title} onChange={(e) => set('title', e.target.value)} required /></label>
        <label>Tipo
          <select value={f.tag} onChange={(e) => set('tag', e.target.value)}>
            {[...new Set([...TAGS, f.tag])].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>Fecha (del evento o de la noticia)<input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></label>
        <label className="full">Texto<textarea rows={6} value={f.body} onChange={(e) => set('body', e.target.value)} /></label>
        <ImageField value={f.image} onChange={(v) => set('image', v)} />
        <label className="check"><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> Publicada (visible para todos)</label>
      </div>
      {error && <p className="alert">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" className="btn ghost" onClick={() => setF(null)}>Cancelar</button>
      </div>
    </form>
  )

  return (
    <>
      <div className="row between"><h2>Noticias y eventos</h2><button className="btn" onClick={() => setF(EMPTY)}>+ Nueva</button></div>
      {error && <p className="alert">{error}</p>}
      {list?.length === 0 && <p className="muted">Todavía no cargaste noticias.</p>}
      <div className="item-list">
        {list?.map((n) => (
          <div key={n.id} className="item">
            <Photo src={n.image} alt="" />
            <div>
              <b>{n.title}</b>
              <span className="muted small">{n.tag}{n.date && ` · ${new Date(n.date + 'T12:00:00').toLocaleDateString('es-AR')}`}{!n.published && ' · Oculta'}</span>
            </div>
            <div className="actions">
              <button className="link" onClick={() => setF(n)}>Editar</button>
              <button className="link danger" onClick={() => del(n)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
