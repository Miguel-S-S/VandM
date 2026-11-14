import { useEffect, useState } from 'react'
import { listActivities, saveActivity, deleteActivity, listCategories, listProducts } from '../lib/data'
import ImageField from '../components/ImageField'
import { Photo } from '../components/ProductCard'
import { useConfirm } from '../components/Confirm'

const EMPTY = { title: '', description: '', category: '', productId: '', level: 'Principiante', minutes: '', recommend: '', image: '', published: true, position: 0 }
const LEVELS = ['Principiante', 'Intermedio', 'Avanzado']

export default function AdminActividades() {
  const ask = useConfirm()
  const [list, setList] = useState(null)
  const [cats, setCats] = useState([])
  const [products, setProducts] = useState([])
  const [f, setF] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => listActivities().then(setList).catch((e) => setError(e.message))
  useEffect(() => { load(); listCategories().then(setCats); listProducts().then(setProducts) }, [])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!(await ask.save(`la actividad «${f.title.trim()}»`, !f.id))) return
    setBusy(true)
    try { await saveActivity(f); setF(null); await load() } catch (err) { setError(err.message) }
    setBusy(false)
  }
  const del = async (a) => {
    if (!(await ask.remove(`la actividad «${a.title}»`))) return
    try { await deleteActivity(a.id); load() } catch (e) { setError(e.message) }
  }

  if (f) return (
    <form className="form" onSubmit={submit}>
      <h2>{f.id ? 'Editar actividad' : 'Nueva actividad'}</h2>
      <div className="panel form-grid">
        <label className="full">Título<input value={f.title} onChange={(e) => set('title', e.target.value)} required /></label>
        <label className="full">Descripción del ejercicio<textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
        <label>Categoría de producto relacionada
          <select value={f.category ?? ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">— ninguna —</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label>Producto específico (opcional)
          <select value={f.productId ?? ''} onChange={(e) => set('productId', e.target.value)}>
            <option value="">— toda la categoría —</option>
            {products.filter((p) => !f.category || p.category === f.category).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Nivel
          <select value={f.level} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
        </label>
        <label>Duración (minutos)<input type="number" min="0" value={f.minutes} onChange={(e) => set('minutes', e.target.value)} /></label>
        <label className="full">Peso / producto recomendado<input value={f.recommend} onChange={(e) => set('recommend', e.target.value)} placeholder="Ej: Tobilleras de 1 a 3 kg" /></label>
        <label>Orden<input type="number" value={f.position} onChange={(e) => set('position', e.target.value)} /></label>
        <ImageField value={f.image} onChange={(v) => set('image', v)} />
        <label className="check"><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> Publicada</label>
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
      <div className="row between"><h2>Actividades</h2><button className="btn" onClick={() => setF({ ...EMPTY, category: cats[0]?.slug ?? '' })}>+ Nueva</button></div>
      <p className="muted small">Cada actividad enlaza con su categoría (o producto) en la tienda. Si elegís un <b>producto específico</b>, al entrar a ese producto el cliente verá estos ejercicios; si solo elegís la categoría, se muestra en todos los productos de esa categoría.</p>
      {error && <p className="alert">{error}</p>}
      <div className="item-list">
        {list?.map((a) => (
          <div key={a.id} className="item">
            <Photo src={a.image} alt="" />
            <div>
              <b>{a.title}</b>
              <span className="muted small">{a.categoryName ?? a.category ?? 'Sin categoría'} · {a.level}{!a.published && ' · Oculta'}</span>
            </div>
            <div className="actions">
              <button className="link" onClick={() => setF(a)}>Editar</button>
              <button className="link danger" onClick={() => del(a)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
