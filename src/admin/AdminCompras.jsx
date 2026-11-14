import { useEffect, useMemo, useState } from 'react'
import { listSuppliers, listMaterials, listPrices, listPurchases, listPurchaseItems, registerPurchase, priceMatrix } from '../lib/insumos'
import { fmtMoney, fmtNum, fmtDay } from '../lib/format'

const today = () => new Date().toISOString().slice(0, 10)
const blankLine = () => ({ key: Math.random().toString(36).slice(2), materialId: '', qty: '', missing: '', price: '', width: '', sizeNote: '' })

export default function AdminCompras() {
  const [sup, setSup] = useState([])
  const [mats, setMats] = useState([])
  const [prices, setPrices] = useState([])
  const [purchases, setPurchases] = useState(null)
  const [items, setItems] = useState({})
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const [s, m, p, pu] = await Promise.all([listSuppliers(), listMaterials(), listPrices(), listPurchases()])
      setSup(s); setMats(m); setPrices(p); setPurchases(pu)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const matrix = useMemo(() => priceMatrix(prices), [prices])
  const subtotal = (form?.lines ?? []).reduce((n, l) => n + (Number(l.qty) || 0) * (Number(l.price) || 0), 0)
  const total = subtotal + (Number(form?.shipping) || 0)
  const supName = (id) => sup.find((s) => s.id === id)?.name ?? 'Sin proveedor'
  const mat = (id) => mats.find((m) => m.id === id)

  const setLine = (key, patch) => setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }))
  const pickMaterial = (key, materialId) => {
    // sugiere el último precio de ese proveedor, o el último costo de compra
    const sid = form.supplierId
    const suggested = (sid && matrix[materialId + '|' + sid]?.price) ?? (Number(mat(materialId)?.last_cost) || '')
    setLine(key, { materialId, price: suggested })
  }
  const toggle = async (p) => {
    setOpen(open === p.id ? null : p.id)
    if (!items[p.id]) { try { const it = await listPurchaseItems([p.id]); setItems((x) => ({ ...x, [p.id]: it })) } catch (e) { setError(e.message) } }
  }

  const submit = async (e) => {
    e.preventDefault(); setError(''); setInfo('')
    const lines = form.lines.filter((l) => l.materialId || l.qty || l.price || l.missing)
    if (!lines.length) return setError('Agregá al menos un insumo')
    for (const l of lines) {
      if (!l.materialId) return setError('Elegí el insumo en todas las líneas')
      if (!(Number(l.qty) > 0) && !(Number(l.missing) > 0)) return setError('Cargá la cantidad recibida (o el faltante)')
      if (Number(l.qty) < 0 || Number(l.missing) < 0) return setError('Las cantidades no pueden ser negativas')
      if (l.price === '' || !(Number(l.price) >= 0)) return setError('Ingresá el precio unitario en todas las líneas')
    }
    setBusy(true)
    try {
      await registerPurchase({ supplierId: form.supplierId, date: form.date, ref: form.ref, notes: form.notes, shipping: form.shipping, items: lines })
      setForm(null); await load(); setInfo('Compra registrada: stock y costos actualizados')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <>
      <div className="row between"><h2>Compras de insumos</h2>
        <button className="btn" onClick={() => setForm({ supplierId: '', date: today(), ref: '', notes: '', shipping: '', lines: [blankLine()] })}>+ Cargar compra</button></div>
      <p className="muted small">Cada compra suma stock (solo lo recibido), reparte el envío en el costo de los insumos, recalcula el costo promedio y guarda el precio del proveedor. El faltante queda registrado pero no se paga ni suma stock.</p>
      {error && <p className="alert">{error}</p>}
      {info && <p className="small" style={{ color: 'var(--accent)' }}>{info}</p>}

      {form && (
        <form className="panel form" onSubmit={submit} noValidate>
          <div className="form-grid">
            <label>Proveedor<select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">— sin proveedor —</option>{sup.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>Fecha<input type="date" value={form.date} max={today()} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label>N° de factura / remito<input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></label>
            <label>Envío / flete ($)<input type="number" min="0" step="any" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} placeholder="0" /></label>
            <label className="full">Notas<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          <div className="lines">
            {form.lines.map((l) => {
              const m = mat(l.materialId)
              const sub = (Number(l.qty) || 0) * (Number(l.price) || 0)
              const share = subtotal > 0 && Number(form.shipping) > 0 && Number(l.qty) > 0 ? ((Number(form.shipping) * sub) / subtotal) / Number(l.qty) : 0
              return (
                <div key={l.key} className="panel line">
                  <div className="form-grid">
                    <label>Insumo<select value={l.materialId} onChange={(e) => pickMaterial(l.key, e.target.value)}>
                      <option value="">— elegir —</option>{mats.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}</select></label>
                    <label>Cantidad recibida {m && `(${m.unit})`}<input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} /></label>
                    <label>Faltante {m && `(${m.unit})`}<input type="number" min="0" step="any" value={l.missing} onChange={(e) => setLine(l.key, { missing: e.target.value })} placeholder="0" /></label>
                    <label>Precio unitario ($)<input type="number" min="0" step="any" value={l.price} onChange={(e) => setLine(l.key, { price: e.target.value })} /></label>
                    {(m?.unit === 'm' || m?.unit === 'cm' || Number(m?.width_cm) > 0) && (
                      <label>Ancho (cm)<input type="number" min="0" step="any" value={l.width} onChange={(e) => setLine(l.key, { width: e.target.value })} placeholder={m?.width_cm ? String(m.width_cm) : 'ej: 150'} /></label>)}
                    <label>Medidas / detalle<input value={l.sizeNote} onChange={(e) => setLine(l.key, { sizeNote: e.target.value })} placeholder="Ej: rollo 150 cm, bolsa 30x40" /></label>
                  </div>
                  <div className="row between small">
                    <span className="muted">
                      {m && Number(m.avg_cost) > 0 && Number(l.price) > 0 && <>Costo prom. actual {fmtMoney(m.avg_cost)} · esta compra {(((Number(l.price) - m.avg_cost) / m.avg_cost) * 100).toFixed(0)}% </>}
                      {share > 0 && <>· con envío {fmtMoney(Number(l.price) + share)}/{m?.unit}</>}
                    </span>
                    <span><b>{fmtMoney(sub)}</b> <button type="button" className="link danger" onClick={() => setForm((f) => ({ ...f, lines: f.lines.length > 1 ? f.lines.filter((x) => x.key !== l.key) : f.lines }))}>Quitar ✕</button></span>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" className="btn ghost" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, blankLine()] }))}>+ Agregar insumo</button>
          <div className="row between"><span><b className="price big">Total {fmtMoney(total)}</b>{Number(form.shipping) > 0 && <small className="muted"> (insumos {fmtMoney(subtotal)} + envío {fmtMoney(form.shipping)})</small>}</span>
            <div className="row"><button className="btn" disabled={busy}>{busy ? 'Guardando…' : 'Registrar compra'}</button>
              <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancelar</button></div></div>
        </form>
      )}

      {!purchases && !error && <p className="muted">Cargando…</p>}
      {purchases?.length === 0 && <p className="muted">Todavía no cargaste compras.</p>}
      <div className="item-list">
        {purchases?.map((p) => (
          <div key={p.id} className="panel" style={{ padding: '.7rem .9rem' }}>
            <button className="order-row" style={{ width: '100%', border: 0, padding: 0, background: 'none' }} onClick={() => toggle(p)}>
              <div><b>{fmtDay(p.purchase_date)}</b> · {supName(p.supplier_id)}<br /><span className="muted small">{p.invoice_ref && `N° ${p.invoice_ref}`} {p.notes}{Number(p.shipping) > 0 && ` · envío ${fmtMoney(p.shipping)}`}</span></div>
              <div style={{ textAlign: 'right' }}><b>{fmtMoney(p.total)}</b><br /><span className="muted small">{open === p.id ? '▲ ocultar' : '▼ ver detalle'}</span></div>
            </button>
            {open === p.id && (
              <ul className="plain" style={{ marginTop: '.6rem' }}>
                {(items[p.id] ?? []).map((i) => (
                  <li key={i.id}>{fmtNum(i.qty, 3)} {mat(i.material_id)?.unit} × <b>{mat(i.material_id)?.name ?? '—'}</b> a {fmtMoney(i.unit_price)} <span className="muted">= {fmtMoney(i.subtotal)}</span>
                    {i.width_cm ? <span className="muted"> · ancho {fmtNum(i.width_cm)} cm</span> : null}{i.size_note ? <span className="muted"> · {i.size_note}</span> : null}
                    {Number(i.qty_missing) > 0 && <b className="danger"> · faltan {fmtNum(i.qty_missing, 3)} {mat(i.material_id)?.unit}</b>}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
