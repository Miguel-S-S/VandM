import { useEffect, useMemo, useState } from 'react'
import { listMaterials, saveMaterial, deleteMaterial, adjustStock, listMovements, listPrices, listSuppliers, priceMatrix } from '../lib/insumos'
import { fmtMoney, fmtNum, fmtDate, fmtPct } from '../lib/format'
import { useConfirm } from '../components/Confirm'

const UNITS = [['kg', 'kg'], ['g', 'g'], ['m', 'm (metros)'], ['cm', 'cm'], ['u', 'unidades'], ['l', 'litros']]
const CATS = ['arena', 'tela', 'hilo', 'cierre', 'relleno', 'embalaje', 'otro']
const KINDS = { compra: 'Compra', ajuste: 'Ajuste', merma: 'Merma', inventario: 'Inventario', consumo: 'Consumo' }
const EMPTY = { name: '', category: 'otro', unit: 'u', min_stock: 0, width_cm: '', waste_pct: 0 }

export default function AdminInsumos() {
  const ask = useConfirm()
  const [mats, setMats] = useState(null)
  const [prices, setPrices] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [form, setForm] = useState(null)
  const [adj, setAdj] = useState(null)
  const [hist, setHist] = useState(null)
  const [moves, setMoves] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const load = async () => {
    try {
      const [m, p, s] = await Promise.all([listMaterials(), listPrices(), listSuppliers()])
      setMats(m); setPrices(p); setSuppliers(s)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const matrix = useMemo(() => priceMatrix(prices), [prices])
  const supName = (id) => suppliers.find((s) => s.id === id)?.name ?? '—'
  const bestOf = (mid) => {
    const list = Object.values(matrix).filter((x) => x.material_id === mid)
    return list.length ? list.reduce((a, b) => (b.price < a.price ? b : a)) : null
  }
  const totals = useMemo(() => ({
    value: (mats ?? []).reduce((n, m) => n + Number(m.stock) * Number(m.avg_cost), 0),
    low: (mats ?? []).filter((m) => m.active && Number(m.min_stock) > 0 && Number(m.stock) <= Number(m.min_stock)).length
  }), [mats])

  const run = async (fn, msg) => {
    setError(''); setInfo('')
    try { await fn(); await load(); if (msg) setInfo(msg) } catch (e) { setError(e.message) }
  }
  const submitMaterial = async (e) => {
    e.preventDefault()
    const before = form.id ? mats.find((m) => m.id === form.id) : null
    const lines = before ? [['name', 'Nombre'], ['category', 'Categoría'], ['unit', 'Unidad'], ['min_stock', 'Stock mínimo'], ['width_cm', 'Ancho'], ['waste_pct', 'Merma %']]
      .filter(([k]) => String(before[k] ?? '') !== String(form[k] ?? '')).map(([k, l]) => `${l}: ${before[k] ?? '—'} → ${form[k] === '' ? '—' : form[k]}`) : undefined
    if (before && !lines.length) { setForm(null); return }
    if (!(await ask.save(`el insumo «${form.name.trim()}»`, !form.id, lines))) return
    run(async () => { await saveMaterial(form); setForm(null) }, 'Guardado')
  }
  const openHist = async (m) => {
    setHist(m); setMoves([])
    try { setMoves(await listMovements(m.id)) } catch (e) { setError(e.message) }
  }
  const doAdjust = async (e) => {
    e.preventDefault()
    const q = Number(adj.qty)
    if (!Number.isFinite(q) || adj.qty === '') return setError('Ingresá una cantidad')
    const m = adj.m
    const delta = adj.kind === 'inventario' ? q - Number(m.stock) : adj.kind === 'merma' ? -Math.abs(q) : q
    if (delta === 0) return setError('No hay diferencia para registrar')
    if (!(await ask.custom({ title: 'Confirmar modificación', message: `¿Ajustar el stock de «${m.name}»?`, lines: [`${fmtNum(m.stock, 3)} → ${fmtNum(Number(m.stock) + delta, 3)} ${m.unit} (${delta > 0 ? '+' : ''}${fmtNum(delta, 3)})`], confirmText: 'Sí, ajustar' }))) return
    run(async () => { await adjustStock({ materialId: m.id, delta, kind: adj.kind, note: adj.note }); setAdj(null) }, 'Stock actualizado')
  }

  return (
    <>
      <div className="row between"><h2>Insumos</h2><button className="btn" onClick={() => setForm({ ...EMPTY })}>+ Nuevo insumo</button></div>
      <p className="muted small">Materia prima de la confección. El stock sube con las compras y se corrige acá con conteos, mermas o ajustes. Las mermas no son estrictas: registralas cuando quieras, y si el stock queda en negativo se corrige con un conteo.</p>
      {error && <p className="alert">{error}</p>}
      {info && <p className="small" style={{ color: 'var(--accent)' }}>{info}</p>}

      <div className="stat-cards">
        <div className="stat"><span>Insumos</span><b>{mats?.length ?? '…'}</b></div>
        <div className="stat"><span>Valor del inventario</span><b>{fmtMoney(totals.value)}</b></div>
        <div className={'stat' + (totals.low ? ' warn' : '')}><span>Bajo el mínimo</span><b>{totals.low}</b></div>
      </div>

      {form && (
        <form className="panel form-grid" onSubmit={submitMaterial}>
          <h3 className="full">{form.id ? 'Editar insumo' : 'Nuevo insumo'}</h3>
          <label>Nombre<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Categoría
            <input list="cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <datalist id="cats">{CATS.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label>Unidad<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>{UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Stock mínimo (alerta)<input type="number" min="0" step="any" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></label>
          <label>Ancho del rollo (cm)<input type="number" min="0" step="any" value={form.width_cm ?? ''} onChange={(e) => setForm({ ...form, width_cm: e.target.value })} placeholder="Solo telas y cintas" /></label>
          <label>Merma orientativa (%)<input type="number" min="0" max="99" step="any" value={form.waste_pct ?? 0} onChange={(e) => setForm({ ...form, waste_pct: e.target.value })} />
            <small className="muted">Recortes o sobrantes que no se pueden aprovechar. Es una referencia para costos; no bloquea nada.</small></label>
          <div className="row full"><button className="btn">Guardar</button><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancelar</button></div>
        </form>
      )}

      {adj && (
        <form className="panel form-grid" onSubmit={doAdjust}>
          <h3 className="full">Ajustar stock · {adj.m.name} <span className="muted small">(hay {fmtNum(adj.m.stock, 3)} {adj.m.unit})</span></h3>
          <label>Tipo
            <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })}>
              <option value="inventario">Conteo: ingreso el stock real</option>
              <option value="merma">Merma / sobrante inutilizable (resta)</option>
              <option value="ajuste">Ajuste manual (+ suma, − resta)</option>
            </select>
          </label>
          <label>{adj.kind === 'inventario' ? `Stock real (${adj.m.unit})` : `Cantidad (${adj.m.unit})`}
            <input type="number" step="any" value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} autoFocus />
          </label>
          <label className="full">Motivo<input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder="Ej: recorte de tela, conteo de fin de mes" /></label>
          <div className="row full"><button className="btn">Registrar</button><button type="button" className="btn ghost" onClick={() => setAdj(null)}>Cancelar</button></div>
        </form>
      )}

      {!mats && !error && <p className="muted">Cargando…</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Insumo</th><th>Categoría</th><th>Ancho</th><th>Merma</th><th>Stock</th><th>Mínimo</th><th>Costo prom.</th><th>Última compra</th><th>Mejor precio</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            {mats?.map((m) => {
              const low = Number(m.min_stock) > 0 && Number(m.stock) <= Number(m.min_stock)
              const best = bestOf(m.id)
              return (
                <tr key={m.id}>
                  <td><b>{m.name}</b></td>
                  <td>{m.category}</td>
                  <td>{m.width_cm ? `${fmtNum(m.width_cm)} cm` : '—'}</td>
                  <td>{Number(m.waste_pct) ? `${fmtNum(m.waste_pct)}%` : '—'}</td>
                  <td className={low ? 'low' : ''}>{fmtNum(m.stock, 3)} {m.unit}{low && ' ⚠'}{Number(m.stock) < 0 && <small className="muted"> (revisar conteo)</small>}</td>
                  <td>{fmtNum(m.min_stock, 3)}</td>
                  <td>{Number(m.avg_cost) ? fmtMoney(m.avg_cost) : '—'}</td>
                  <td>{Number(m.last_cost) ? fmtMoney(m.last_cost) : '—'}</td>
                  <td>{best ? <>{fmtMoney(best.price)} <span className="muted small">{supName(best.supplier_id)}</span></> : '—'}</td>
                  <td>{fmtMoney(Number(m.stock) * Number(m.avg_cost))}</td>
                  <td className="actions">
                    <button className="link" onClick={() => setAdj({ m, kind: 'inventario', qty: '', note: '' })}>Ajustar</button>
                    <button className="link" onClick={() => openHist(m)}>Historial</button>
                    <button className="link" onClick={() => setForm({ ...m })}>Editar</button>
                    <button className="link danger" onClick={async () => (await ask.remove(`el insumo «${m.name}»`)) && run(() => deleteMaterial(m.id), 'Insumo eliminado')}>Eliminar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hist && (
        <div className="panel">
          <div className="row between"><h3>Historial · {hist.name}</h3><button className="link muted" onClick={() => setHist(null)}>Cerrar ✕</button></div>
          <h4>Movimientos de stock</h4>
          {moves.length === 0 && <p className="muted small">Sin movimientos.</p>}
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Costo unit.</th><th>Nota</th></tr></thead>
            <tbody>{moves.map((x) => (
              <tr key={x.id}><td>{fmtDate(x.created_at)}</td><td>{KINDS[x.kind] ?? x.kind}</td>
                <td style={{ color: x.qty < 0 ? 'var(--danger)' : '#4ade80' }}>{x.qty > 0 ? '+' : ''}{fmtNum(x.qty, 3)} {hist.unit}</td>
                <td>{x.unit_cost != null ? fmtMoney(x.unit_cost) : '—'}</td><td>{x.note}</td></tr>
            ))}</tbody></table></div>
          <h4>Precios por proveedor</h4>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Proveedor</th><th>Precio</th><th>Origen</th><th>Nota</th></tr></thead>
            <tbody>{prices.filter((p) => p.material_id === hist.id).map((p) => (
              <tr key={p.id}><td>{fmtDate(p.created_at)}</td><td>{supName(p.supplier_id)}</td><td>{fmtMoney(p.price)}</td><td>{p.source}</td><td>{p.note}</td></tr>
            ))}</tbody></table></div>
        </div>
      )}
    </>
  )
}
