import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getProduct, saveProduct, uploadImage, listCategories, listProducts } from '../lib/data'
import { weightVariants } from '../lib/demoData'
import { uid, fmtMoney } from '../lib/format'
import { toFormVariant, fromFormVariant, onPromo } from '../lib/pricing'
import { useConfirm } from '../components/Confirm'
import { isIg, isYt, ytThumb, parseImageLink, sameMedia, igParts, withRatio, RATIOS } from '../lib/images'
import { IgFrame } from '../components/Media'

const EMPTY = { name: '', category: '', description: '', images: [], active: true, featured: false, variants: [], isCombo: false, comboItems: [], combo: { id: null, price: '', stock: 0, active: true } }
// el combo se guarda como un producto con una sola variante: price = precio del combo, listPrice = suma de los artículos por separado
const comboOf = (x) => { const v = x.variants?.[0]; return { id: v?.id ?? null, price: v ? v.price : '', stock: v?.stock ?? 0, active: v?.active ?? true } }

export default function ProductoForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const ask = useConfirm()
  const [p, setP] = useState(id ? null : EMPTY)
  const [orig, setOrig] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [cb, setCb] = useState({ productId: '', variantId: '', qty: 1 })
  const [pr, setPr] = useState({ pct: '', ends: '', label: '' })
  const [cats, setCats] = useState([])
  const [gen, setGen] = useState({ from: 1, to: 8, base: '', step: '' })
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    listCategories().then((c) => { setCats(c); if (!id) setP((x) => ({ ...x, category: c[0]?.slug ?? '' })) })
    listProducts().then(setCatalog).catch(() => {})
    if (id) getProduct(id).then((x) => {
      if (!x) return nav('/admin/productos')
      setOrig(x)
      setP(x.isCombo ? { ...x, combo: comboOf(x), variants: [] } : { ...x, combo: comboOf({}), variants: x.variants.map(toFormVariant) })
    })
  }, [id])

  if (!p) return <p className="muted">Cargando…</p>
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }))
  const setVar = (vid, k, v) => set('variants', p.variants.map((x) => (x.id === vid ? { ...x, [k]: v } : x)))

  const addVariant = () => set('variants', [...p.variants, { id: uid(), label: '', weight_kg: '', price: 0, stock: 0, active: true }])
  const generate = async () => {
    if (p.variants.length && !(await ask.custom({ title: 'Reemplazar variantes', message: 'Esto reemplaza las variantes actuales (pesos, precios y stock) del formulario. ¿Continuar?', confirmText: 'Sí, reemplazar', danger: true }))) return
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

  // ---- promociones
  const applyPromo = async () => {
    const pct = Number(pr.pct)
    if (!(pct > 0 && pct < 100)) return setError('Ingresá un descuento entre 1 y 99 %')
    if (!(await ask.custom({ title: 'Aplicar promoción', message: `¿Aplicar ${pct}% de descuento a las ${p.variants.length} variantes del formulario?`, lines: ['Se guarda recién cuando toques “Guardar producto”.'], confirmText: 'Sí, aplicar' }))) return
    setError('')
    set('variants', p.variants.map((v) => ({ ...v, promoOn: true, promoPrice: Math.round(Number(v.price) * (1 - pct / 100)), promoEnds: pr.ends, promoLabel: pr.label })))
  }
  const clearPromo = () => set('variants', p.variants.map((v) => ({ ...v, promoOn: false })))

  // ---- combo
  const chosenProd = catalog.find((x) => x.id === cb.productId)
  const priceOfVariant = (vid) => catalog.flatMap((x) => x.variants).find((v) => v.id === vid)?.price
  const separate = (p.comboItems ?? []).reduce((n, i) => n + (Number(priceOfVariant(i.variantId)) || 0) * i.qty, 0)
  const comboPrice = Number(p.combo?.price) || 0
  const addComboItem = () => {
    const v = chosenProd?.variants.find((x) => x.id === cb.variantId)
    if (!chosenProd || !v) return setError('Elegí el artículo y el peso que lleva el combo')
    setError('')
    const qty = Math.max(1, parseInt(cb.qty, 10) || 1)
    const found = (p.comboItems ?? []).find((i) => i.variantId === v.id)
    set('comboItems', found
      ? p.comboItems.map((i) => (i.variantId === v.id ? { ...i, qty: i.qty + qty } : i))
      : [...(p.comboItems ?? []), { productId: chosenProd.id, variantId: v.id, name: chosenProd.name, label: v.label, qty }])
    setCb({ productId: cb.productId, variantId: '', qty: 1 })
  }
  const toggleCombo = (on) => setP((x) => ({ ...x, isCombo: on }))

  const changeLines = () => {
    if (!orig) return undefined
    const L = []
    if (orig.name !== p.name) L.push(`Nombre: ${orig.name} → ${p.name}`)
    if ((orig.category ?? '') !== (p.category ?? '')) L.push('Cambia la categoría')
    if (orig.active !== p.active) L.push(p.active ? 'Pasa a visible en la tienda' : 'Pasa a oculto en la tienda')
    if (orig.featured !== p.featured) L.push(p.featured ? 'Se marca como destacado' : 'Deja de ser destacado')
    if (orig.description !== p.description) L.push('Cambia la descripción')
    if (JSON.stringify(orig.images) !== JSON.stringify(p.images)) L.push('Cambian las fotos')
    const now = built.variants
    now.forEach((v) => {
      const o = orig.variants.find((x) => x.id === v.id)
      if (!o) { L.push(`Variante nueva ${v.label}: ${fmtMoney(v.price)}`); return }
      if (Number(o.price) !== v.price) L.push(`${v.label} · precio: ${fmtMoney(o.price)} → ${fmtMoney(v.price)}`)
      if (Number(o.stock) !== v.stock) L.push(`${v.label} · stock: ${o.stock} → ${v.stock}`)
      if (onPromo(o) !== (v.listPrice != null)) L.push(`${v.label} · ${v.listPrice != null ? 'promoción activada' : 'promoción quitada'}`)
      if (o.active !== v.active) L.push(`${v.label} · ${v.active ? 'activada' : 'desactivada'}`)
    })
    orig.variants.filter((o) => !now.some((v) => v.id === o.id)).forEach((o) => L.push(`Se elimina la variante ${o.label}`))
    if (p.isCombo && JSON.stringify(orig.comboItems ?? []) !== JSON.stringify(p.comboItems)) L.push('Cambia el contenido del combo')
    return L.length > 8 ? [...L.slice(0, 8), `…y ${L.length - 8} cambio(s) más`] : L
  }

  // producto listo para guardar (variantes con precio final y datos de promoción)
  const built = {
    ...p,
    variants: p.isCombo
      ? [{ id: p.combo.id || uid(), label: 'Combo', weight_kg: '', stock: parseInt(p.combo.stock, 10) || 0, active: p.combo.active, price: comboPrice, listPrice: separate > comboPrice ? separate : null, promoLabel: '', promoEnds: '' }]
      : p.variants.map(fromFormVariant)
  }

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!p.name.trim()) return setError('Ingresá el nombre del producto')
    if (p.isCombo) {
      if (!(p.comboItems ?? []).length) return setError('Agregá al menos un artículo al combo')
      if (!(comboPrice > 0)) return setError('Ingresá el precio del combo')
    } else {
      const bad = p.variants.find((v) => v.promoOn && !(Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.price)))
      if (bad) return setError(`La promoción de ${bad.label || 'una variante'} debe tener un precio menor al normal`)
    }
    const lines = changeLines()
    if (id && lines && !lines.length) return nav('/admin/productos')
    if (!(await ask.save(`${p.isCombo ? 'el combo' : 'el producto'} «${p.name.trim()}»`, !id, lines))) return
    setBusy(true)
    try {
      const { combo, ...clean } = built // eslint-disable-line no-unused-vars
      await saveProduct({ ...clean, comboItems: p.isCombo ? p.comboItems : [] })
      nav('/admin/productos')
    } catch (err) { setError(err.message); setBusy(false) }
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
        <label className="check full"><input type="checkbox" checked={p.isCombo} onChange={(e) => toggleCombo(e.target.checked)} /> Es un combo (pack de varios artículos con precio especial)</label>
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
            placeholder="O pegá un enlace: foto (https://…), publicación de Instagram o video de YouTube"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
          <button type="button" className="btn ghost" onClick={addLink}>Agregar enlace</button>
        </div>
        <p className="muted small">Los enlaces no usan espacio de Supabase. Las publicaciones de Instagram (deben ser públicas) se muestran en la página del producto recortadas a un marco; elegí el encuadre que mejor calce. Los videos de YouTube se reproducen en la página del producto. La portada de la tienda usa la primera foto (o, si no hay, la miniatura del video).</p>
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
                : isYt(src)
                  ? <><img src={ytThumb(src)} alt="" referrerPolicy="no-referrer" /><span className="tag">▶ YouTube</span></>
                  : <img src={src} alt="" referrerPolicy="no-referrer" />}
              {!isIg(src) && !isYt(src) && p.images.findIndex((x) => !isIg(x) && !isYt(x)) === i && <span className="tag">Portada</span>}
              <div className="img-actions">
                <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} aria-label="Mover antes">←</button>
                <button type="button" onClick={() => moveImg(i, 1)} disabled={i === p.images.length - 1} aria-label="Mover después">→</button>
                <button type="button" className="danger" onClick={() => set('images', p.images.filter((_, k) => k !== i))} aria-label="Quitar">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {p.isCombo ? (
      <div className="panel">
        <h3>Contenido y precio del combo</h3>
        <p className="muted small">Armá el pack eligiendo los artículos (y el peso de cada uno). El cliente verá el precio por separado tachado y lo que ahorra.</p>
        <div className="gen">
          <label style={{ width: 200 }}>Artículo
            <select value={cb.productId} onChange={(e) => setCb({ productId: e.target.value, variantId: '', qty: 1 })}>
              <option value="">— elegir —</option>
              {catalog.filter((x) => !x.isCombo && x.id !== id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select></label>
          <label style={{ width: 200 }}>Peso
            <select value={cb.variantId} onChange={(e) => setCb({ ...cb, variantId: e.target.value })} disabled={!chosenProd}>
              <option value="">— elegir —</option>
              {chosenProd?.variants.filter((v) => v.active).map((v) => <option key={v.id} value={v.id}>{v.label} · {fmtMoney(v.price)}</option>)}
            </select></label>
          <label style={{ width: 90 }}>Cantidad<input type="number" min="1" value={cb.qty} onChange={(e) => setCb({ ...cb, qty: e.target.value })} /></label>
          <button type="button" className="btn ghost" onClick={addComboItem}>+ Agregar al combo</button>
        </div>
        <div className="combo-lines">
          {(p.comboItems ?? []).length === 0 && <p className="muted small">Todavía no agregaste artículos.</p>}
          {(p.comboItems ?? []).map((i) => (
            <div key={i.variantId} className="combo-line">
              <span>{i.qty} × <b>{i.name} {i.label}</b> <span className="muted small">{priceOfVariant(i.variantId) != null ? `· ${fmtMoney(priceOfVariant(i.variantId))} c/u` : '· (esa variante ya no existe)'}</span></span>
              <span className="row" style={{ gap: '.5rem' }}>
                <span className="qty sm">
                  <button type="button" onClick={() => set('comboItems', p.comboItems.map((x) => (x.variantId === i.variantId ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>−</button>
                  <span>{i.qty}</span>
                  <button type="button" onClick={() => set('comboItems', p.comboItems.map((x) => (x.variantId === i.variantId ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                </span>
                <button type="button" className="link danger" onClick={() => set('comboItems', p.comboItems.filter((x) => x.variantId !== i.variantId))}>Quitar</button>
              </span>
            </div>
          ))}
        </div>
        <div className="form-grid">
          <label>Precio por separado (calculado)<input value={fmtMoney(separate)} readOnly /></label>
          <label>Precio del combo (ARS)<input type="number" min="0" value={p.combo.price} onChange={(e) => set('combo', { ...p.combo, price: e.target.value })} /></label>
          <label>Stock del combo<input type="number" min="0" value={p.combo.stock} onChange={(e) => set('combo', { ...p.combo, stock: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={p.combo.active} onChange={(e) => set('combo', { ...p.combo, active: e.target.checked })} /> Combo disponible</label>
        </div>
        {comboPrice > 0 && separate > 0 && (
          comboPrice < separate
            ? <p className="small" style={{ color: '#4ade80' }}>El cliente ahorra {fmtMoney(separate - comboPrice)} ({Math.round((1 - comboPrice / separate) * 100)}% de descuento).</p>
            : <p className="small" style={{ color: 'var(--danger)' }}>El precio del combo no es menor al de comprar los artículos por separado: no se mostrará ahorro.</p>
        )}
        <p className="muted small">El combo tiene su propio stock (los artículos sueltos no se descuentan automáticamente al vender un combo).</p>
      </div>

      ) : (
      <div className="panel">
        <h3>Pesos, precios, promociones y stock</h3>
        <div className="gen">
          <span className="muted small">Generar pesos:</span>
          <label>Desde<input type="number" min="0" value={gen.from} onChange={(e) => setGen({ ...gen, from: e.target.value })} /></label>
          <label>Hasta<input type="number" min="1" value={gen.to} onChange={(e) => setGen({ ...gen, to: e.target.value })} /></label>
          <label>Precio inicial<input type="number" min="0" value={gen.base} onChange={(e) => setGen({ ...gen, base: e.target.value })} /></label>
          <label>+ por kg<input type="number" min="0" value={gen.step} onChange={(e) => setGen({ ...gen, step: e.target.value })} /></label>
          <button type="button" className="btn ghost" onClick={generate}>Generar</button>
        </div>

        <div className="promo-box">
          <b className="small" style={{ width: '100%' }}>🔥 Promoción rápida (descuento para todas las variantes)</b>
          <label>Descuento (%)<input type="number" min="1" max="99" value={pr.pct} onChange={(e) => setPr({ ...pr, pct: e.target.value })} placeholder="Ej: 15" /></label>
          <label>Válida hasta (opcional)<input type="date" value={pr.ends} onChange={(e) => setPr({ ...pr, ends: e.target.value })} /></label>
          <label>Etiqueta que ve el cliente<input list="promo-labels" value={pr.label} onChange={(e) => setPr({ ...pr, label: e.target.value })} placeholder="Oferta" /><datalist id="promo-labels">{['Oferta', 'Promoción', 'Liquidación', 'Precio especial', 'Semana del deporte'].map((l) => <option key={l} value={l} />)}</datalist></label>
          <button type="button" className="btn ghost" onClick={applyPromo} disabled={!p.variants.length}>Aplicar</button>
          <button type="button" className="link danger" onClick={clearPromo}>Quitar todas las promos</button>
        </div>
        <div className="table-wrap">
          <table className="table vtable">
            <thead><tr><th>Etiqueta</th><th>Kg</th><th>Precio normal (ARS)</th><th>Promo</th><th>Precio promo</th><th>Hasta</th><th>Stock</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              {p.variants.map((v) => (
                <tr key={v.id}>
                  <td><input value={v.label} onChange={(e) => setVar(v.id, 'label', e.target.value)} placeholder="1 kg" /></td>
                  <td><input type="number" step="0.5" min="0" value={v.weight_kg ?? ''}
                    onChange={(e) => { setVar(v.id, 'weight_kg', e.target.value); if (!v.label || /^[\d.,]+ kg$/.test(v.label)) setVar(v.id, 'label', e.target.value ? `${e.target.value} kg` : '') }} /></td>
                  <td><input type="number" min="0" value={v.price} onChange={(e) => setVar(v.id, 'price', e.target.value)} /></td>
                  <td><input type="checkbox" checked={!!v.promoOn} onChange={(e) => setVar(v.id, 'promoOn', e.target.checked)} aria-label="Promoción" /></td>
                  <td><input type="number" min="0" value={v.promoPrice ?? ''} disabled={!v.promoOn} onChange={(e) => setVar(v.id, 'promoPrice', e.target.value)}
                    style={v.promoOn && Number(v.promoPrice) >= Number(v.price) ? { borderColor: 'var(--danger)' } : undefined} /></td>
                  <td><input type="date" value={v.promoEnds ?? ''} disabled={!v.promoOn} onChange={(e) => setVar(v.id, 'promoEnds', e.target.value)} /></td>
                  <td><input type="number" min="0" value={v.stock} onChange={(e) => setVar(v.id, 'stock', e.target.value)} /></td>
                  <td><input type="checkbox" checked={v.active} onChange={(e) => setVar(v.id, 'active', e.target.checked)} /></td>
                  <td><button type="button" className="link danger" onClick={() => set('variants', p.variants.filter((x) => x.id !== v.id))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn ghost" onClick={addVariant}>+ Agregar peso</button>
        <p className="muted small">Con “Promo” el cliente ve el precio normal tachado y el precio promocional, que es el que se cobra. Si ponés fecha, la promo termina sola y el precio vuelve al normal. Los cambios de precio y stock quedan registrados en Auditoría.</p>
      </div>

      )}

      {error && <p className="alert">{error}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Guardando…' : p.isCombo ? 'Guardar combo' : 'Guardar producto'}</button>
        <Link to="/admin/productos" className="btn ghost">Cancelar</Link>
      </div>
    </form>
  )
}
