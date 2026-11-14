import { useEffect, useMemo, useState } from 'react'
import { listSuppliers, saveSupplier, deleteSupplier, listMaterials, listPrices, addPrice, priceMatrix } from '../lib/insumos'
import { fmtMoney, fmtDate, fmtPct } from '../lib/format'
import { normalizePhone, cleanPhoneInput } from '../lib/phone'
import { waNumber } from '../lib/orders'

const EMPTY = { name: '', phone: '', notes: '', active: true }

export default function AdminProveedores() {
  const [tab, setTab] = useState('lista')
  const [sup, setSup] = useState(null)
  const [mats, setMats] = useState([])
  const [prices, setPrices] = useState([])
  const [form, setForm] = useState(null)
  const [pf, setPf] = useState({ supplierId: '', materialId: '', price: '', note: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const load = async () => {
    try {
      const [s, m, p] = await Promise.all([listSuppliers(), listMaterials(), listPrices()])
      setSup(s); setMats(m); setPrices(p)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])
  const run = async (fn, msg) => { setError(''); setInfo(''); try { await fn(); await load(); if (msg) setInfo(msg) } catch (e) { setError(e.message) } }

  const matrix = useMemo(() => priceMatrix(prices), [prices])
  const activeSup = (sup ?? []).filter((s) => s.active)
  const mname = (id) => mats.find((m) => m.id === id)?.name ?? '—'

  const savePhone = (v) => { const n = normalizePhone(v); return n.ok ? n.pretty : v }

  return (
    <>
      <h2>Proveedores y precios</h2>
      <div className="chips">
        {[['lista', 'Proveedores'], ['precios', 'Lista de precios'], ['comparador', 'Comparador']].map(([k, l]) => (
          <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {error && <p className="alert">{error}</p>}
      {info && <p className="small" style={{ color: 'var(--accent)' }}>{info}</p>}

      {tab === 'lista' && (
        <>
          <button className="btn" onClick={() => setForm({ ...EMPTY })}>+ Nuevo proveedor</button>
          {form && (
            <form className="panel form-grid" style={{ marginTop: '1rem' }} onSubmit={(e) => { e.preventDefault(); run(async () => { await saveSupplier(form); setForm(null) }, 'Guardado') }}>
              <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Teléfono / WhatsApp<input value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: cleanPhoneInput(e.target.value) })} onBlur={() => setForm((f) => ({ ...f, phone: savePhone(f.phone) }))} /></label>
              <label className="full">Notas<textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Condiciones, días de entrega, forma de pago…" /></label>
              <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Activo</label>
              <div className="row full"><button className="btn">Guardar</button><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancelar</button></div>
            </form>
          )}
          <div className="item-list" style={{ marginTop: '1rem' }}>
            {sup?.length === 0 && <p className="muted">Todavía no cargaste proveedores.</p>}
            {sup?.map((s) => (
              <div key={s.id} className="item" style={{ gridTemplateColumns: '1fr auto' }}>
                <div><b>{s.name}</b>{!s.active && <span className="pill off" style={{ marginLeft: '.5rem' }}>Inactivo</span>}
                  <span className="muted small">{s.phone && <a href={`https://wa.me/${waNumber(s.phone)}`} target="_blank" rel="noreferrer">{s.phone}</a>}{s.notes && ` · ${s.notes}`}</span></div>
                <div className="actions">
                  <button className="link" onClick={() => setForm({ ...s })}>Editar</button>
                  <button className="link danger" onClick={() => confirm(`¿Eliminar a ${s.name}? Se borra también su lista de precios.`) && run(() => deleteSupplier(s.id))}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'precios' && (
        <>
          <form className="panel form-grid" onSubmit={(e) => { e.preventDefault(); run(async () => { await addPrice(pf); setPf({ ...pf, price: '', note: '' }) }, 'Precio registrado') }}>
            <h3 className="full">Registrar precio cotizado</h3>
            <label>Proveedor<select value={pf.supplierId} onChange={(e) => setPf({ ...pf, supplierId: e.target.value })} required>
              <option value="">— elegir —</option>{activeSup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>Insumo<select value={pf.materialId} onChange={(e) => setPf({ ...pf, materialId: e.target.value })} required>
              <option value="">— elegir —</option>{mats.map((m) => <option key={m.id} value={m.id}>{m.name} (por {m.unit})</option>)}</select></label>
            <label>Precio por unidad ($)<input type="number" min="0" step="any" value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} required /></label>
            <label>Nota<input value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} placeholder="Ej: lista de noviembre" /></label>
            <div className="row full"><button className="btn">Registrar precio</button></div>
          </form>
          <p className="muted small">Las compras que cargues también actualizan esta lista automáticamente.</p>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Proveedor</th><th>Insumo</th><th>Precio</th><th>Variación</th><th>Origen</th></tr></thead>
            <tbody>
              {prices.slice(0, 200).map((p) => {
                const m = matrix[p.material_id + '|' + p.supplier_id]
                const isLatest = m?.id === p.id
                return (
                  <tr key={p.id}><td>{fmtDate(p.created_at)}</td><td>{sup?.find((s) => s.id === p.supplier_id)?.name ?? '—'}</td><td>{mname(p.material_id)}</td>
                    <td>{fmtMoney(p.price)}</td>
                    <td style={{ color: isLatest && m.change > 0 ? 'var(--danger)' : isLatest && m.change < 0 ? '#4ade80' : undefined }}>{isLatest ? fmtPct(m.change) : ''}</td>
                    <td>{p.source}</td></tr>
                )
              })}
            </tbody></table></div>
        </>
      )}

      {tab === 'comparador' && (
        <>
          <p className="muted small">Último precio de cada proveedor por insumo. En verde el más barato; el % es cuánto más caro es respecto al mejor.</p>
          <div className="table-wrap"><table className="table matrix">
            <thead><tr><th>Insumo</th>{sup?.filter((s) => s.active).map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead>
            <tbody>
              {mats.map((m) => {
                const cells = (sup ?? []).filter((s) => s.active).map((s) => matrix[m.id + '|' + s.id])
                const valid = cells.filter(Boolean).map((c) => c.price)
                const min = valid.length ? Math.min(...valid) : null
                return (
                  <tr key={m.id}><td><b>{m.name}</b> <span className="muted small">/{m.unit}</span></td>
                    {cells.map((c, i) => (
                      <td key={i} className={c && c.price === min && valid.length > 1 ? 'best' : ''}>
                        {c ? <>{fmtMoney(c.price)}{c.price !== min && min > 0 && <span className="muted small"> +{(((c.price - min) / min) * 100).toFixed(0)}%</span>}
                          {c.change != null && c.change !== 0 && <span className="small" style={{ color: c.change > 0 ? 'var(--danger)' : '#4ade80' }}> {c.change > 0 ? '▲' : '▼'}{Math.abs(c.change).toFixed(0)}%</span>}</> : <span className="muted">—</span>}
                      </td>
                    ))}</tr>
                )
              })}
            </tbody></table></div>
        </>
      )}
    </>
  )
}
