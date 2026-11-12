import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getProduct, saveProduct, uploadImage, listCategories } from '../lib/data'
import { weightVariants } from '../lib/demoData'
import { uid } from '../lib/format'
import { isIg, parseImageLink, sameMedia, igParts, withRatio, RATIOS } from '../lib/images'
import { IgFrame } from '../components/Media'

const EMPTY = { name: '', category: '', description: '', images: [], active: true, featured: false, variants: [] }

export default function ProductoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState(id ? null : EMPTY)
  const [cats, setCats] = useState([])
  const [gen, setGen] = useState({ from: 1, to: 8, base: '', step: '' })
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    listCategories().then((c) => { setCats(c); if (!id) setP((x) => ({ ...x, category: c[0]?.slug ?? '' })) })
    if (id) getProduct(id).then((x) => (x ? setP(x) : nav('/admin/productos')))
  }, [id])

  if (!p) return <p className="muted">Cargando…</p>
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }))
  const setVar = (vid, k, v) => set('variants', p.variants.map((x) => (x.id === vid ? { ...x, [k]: v } : x)))

  const addVariant = () => set('variants', [...p.variants, { id: uid(), label: '', weight_kg: '', price: 0, stock: 0, active: true }])
  const generate = () => {
    if (p.variants.length && !confirm('Esto reemplaza las variantes actuales. ¿Continuar?')) return
    set('variants', weightVariants(Number(gen.base) || 0, Number(gen.step) || 0, Number(gen.from), Number(gen.to), 0))
  }

  const onFiles = async (e) => {
    const files = [...e.target.files]
    e.target.value = ''
    if (!files.length) return
    setUploading(true); setError('')
    const failed = []
    // se suben de a una; las que salen bien se agregan aunque otra falle
    for (const f of files) {
      try {
        const url = await uploadImage(f)
        setP((x) => ({ ...x, images: [...x.images, url] }))
      } catch (err) { failed.push(`${f.name}: ${err.message}`) }
    }
    if (failed.length) setError('No se pudieron subir: ' + failed.join(' · '))
    setUploading(false)
  }
  const addLink = () => {
    try {
      const v = parseImageLink(link)
      if (p.images.some((x) => sameMedia(x, v))) throw new Error('Ese enlace ya está agregado')
      setP((x) => ({ ...x, images: [...x.images, v] })); setLink(''); setError('')
    } catch (err) { setError(err.message) }
  }
  const moveImg = (i, d) => {
    const a = [...p.images]; const j = i + d
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; set('images', a)
  }

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!p.name.trim()) return setError('Ingresá el nombre del producto')
    setBusy(true)
    try { await saveProduct(p); nav('/admin/productos') }
    catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="form">
      <Link to="/admin/productos" className="back">← Productos</Link>
      <h2>{id ? 'Editar producto' : 'Nuevo producto'}</h2>

      <div className="panel form-grid">
        <label>Nombre<input value={p.name} onChange={(e) => set('name', e.target.value)} required placeholder="Ej: Tobilleras con peso" /></label>
        <label>Categoría
          <select value={p.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="full">Descripción<textarea rows={4} value={p.description} onChange={(e) => set('description', e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} /> Visible en la tienda</label>
        <label className="check"><input type="checkbox" checked={p.featured} onChange={(e) => set('featured', e.target.checked)} /> Destacado</label>
      </div>

      <div className="panel">
        <div className="row between"><h3>Fotos</h3>
          <button type="button" className="btn ghost" onClick={() => fileRef.current.click()} disabled={uploading}>
            {uploading ? 'Subiendo…' : '+ Agregar fotos'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
        <div className="row" style={{ marginTop: '.6rem' }}>
          <input style={{ flex: 1, minWidth: 200 }} value={link} onChange={(e) => setLink(e.target.value)}
            placeholder="O pegá un enlace: foto (https://…) o publicación de Instagram (…/p/XXXX)"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
          <button type="button" className="btn ghost" onClick={addLink}>Agregar enlace</button>
        </div>
        <p className="muted small">Los enlaces no usan espacio de Supabase. Las publicaciones de Instagram (deben ser públicas) se muestran en la página del producto recortadas a un marco; elegí el encuadre que mejor calce. La portada de la tienda usa la primera foto que no sea de Instagram.</p>
        {p.images.length === 0 && <p className="muted small">Sin fotos todavía. La primera es la portada. Podés sacarlas con la cámara del celular.</p>}
        <div className="img-list">
          {p.images.map((src, i) => (
            <div key={src + i} className="img-item">
              {isIg(src)
                ? <>
                    <IgFrame src={src} mini width={130} />
                    <select className="ratio-sel" value={igParts(src).ratio} aria-label="Encuadre"
                      onChange={(e) => set('images', p.images.map((x, k) => (k === i ? withRatio(x, e.target.value) : x)))}>
                      {RATIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </>
                : <img src={src} alt="" referrerPolicy="no-referrer" />}
              {!isIg(src) && p.images.findIndex((x) => !isIg(x)) === i && <span className="tag">Portada</span>}
              <div className="img-actions">
                <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} aria-label="Mover antes">←</button>
                <button type="button" onClick={() => moveImg(i, 1)} disabled={i === p.images.length - 1} aria-label="Mover después">→</button>
                <button type="button" className="danger" onClick={() => set('images', p.images.filter((_, k) => k !== i))} aria-label="Quitar">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Pesos, precios y stock</h3>
        <div className="gen">
          <span className="muted small">Generar pesos:</span>
          <label>Desde<input type="number" min="0" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} /></label>
          <label>Hasta<input type="number" min="1" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} /></label>
          <label>Precio inicial<input type="number" min="0" value={gen.base} onChange={(e) => setGen({ ...gen, base: e.target.value })} /></label>
          <label>+ por kg<input type="number" min="0" value={gen.step} onChange={(e) => setGen({ ...gen, step: e.target.value })} /></label>
          <button type="button" className="btn ghost" onClick={generate}>Generar</button>
        </div>

        <div className="table-wrap">
          <table className="table vtable">
            <thead><tr><th>Etiqueta</th><th>Kg</th><th>Precio (ARS)</th><th>Stock</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              {p.variants.map((v) => (
                <tr key={v.id}>
                  <td><input value={v.label} onChange={(e) => setVar(v.id, 'label', e.target.value)} placeholder="1 kg" /></td>
                  <td><input type="number" step="0.5" min="0" value={v.weight_kg ?? ''}
                    onChange={(e) => { setVar(v.id, 'weight_kg', e.target.value); if (!v.label || /^[\d.,]+ kg$/.test(v.label)) setVar(v.id, 'label', e.target.value ? `${e.target.value} kg` : '') }} /></td>
                  <td><input type="number" min="0" value={v.price} onChange={(e) => setVar(v.id, 'price', e.target.value)} /></td>
                  <td><input type="number" min="0" value={v.stock} onChange={(e) => setVar(v.id, 'stock', e.target.value)} /></td>
                  <td><input type="checkbox" checked={v.active} onChange={(e) => setVar(v.id, 'active', e.target.checked)} /></td>
                  <td><button type="button" className="link danger" onClick={() => set('variants', p.variants.filter((x) => x.id !== v.id))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn ghost" onClick={addVariant}>+ Agregar peso</button>
        <p className="muted small">Los cambios de precio y stock quedan registrados en Auditoría.</p>
      </div>

      {error && <p className="alert">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar producto'}</button>
        <Link to="/admin/productos" className="btn ghost">Cancelar</Link>
      </div>
    </form>
  )
}
