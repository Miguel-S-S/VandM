import { useEffect, useMemo, useState } from 'react'
import { listMaterials, listCuts, saveCut, deleteCut, listSteps, saveStep, deleteStep, getCostSettings, saveCostSettings } from '../lib/insumos'
import { planCut, metersWithWaste, laborFor } from '../lib/cuts'
import { fmtMoney, fmtNum } from '../lib/format'

const blank = () => ({ key: Math.random().toString(36).slice(2), label: '', w: '', h: '', n: 1 })

export default function AdminCostos() {
  const [tab, setTab] = useState('corte')
  const [mats, setMats] = useState([])
  const [cuts, setCuts] = useState([])
  const [steps, setSteps] = useState([])
  const [cfg, setCfg] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // calculadora de corte
  const [c, setC] = useState({ id: null, name: '', materialId: '', rollWidth: '', margin: 1, wastePct: '', note: '', pieces: [blank()] })

  const load = async () => {
    try {
      const [m, ct, st, cf] = await Promise.all([listMaterials(), listCuts(), listSteps(), getCostSettings()])
      setMats(m); setCuts(ct); setSteps(st); setCfg(cf)
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])
  const run = async (fn, msg) => { setError(''); setInfo(''); try { await fn(); await load(); if (msg) setInfo(msg) } catch (e) { setError(e.message) } }

  const fabrics = mats.filter((m) => m.unit === 'm' || m.unit === 'cm' || Number(m.width_cm) > 0)
  const mat = mats.find((m) => m.id === c.materialId)
  const result = useMemo(() => planCut({ rollWidth: c.rollWidth, margin: c.margin, pieces: c.pieces }), [c.rollWidth, c.margin, c.pieces])
  const wastePct = c.wastePct === '' ? Number(mat?.waste_pct) || 0 : Number(c.wastePct)
  const meters = result.error ? 0 : metersWithWaste(result.lengthCm, cfg?.count_waste === false ? 0 : wastePct)
  const unitCost = Number(mat?.avg_cost) || 0
  const setPiece = (key, p) => setC((x) => ({ ...x, pieces: x.pieces.map((q) => (q.key === key ? { ...q, ...p } : q)) }))
  const pickMat = (id) => { const m = mats.find((x) => x.id === id); setC((x) => ({ ...x, materialId: id, rollWidth: m?.width_cm ?? x.rollWidth })) }

  const saveTemplate = () => run(async () => {
    if (result.error) throw new Error(result.error)
    await saveCut({ id: c.id, name: c.name, material_id: c.materialId, roll_width_cm: c.rollWidth, margin_cm: c.margin, length_cm: result.lengthCm, waste_pct: wastePct, note: c.note,
      pieces: c.pieces.filter((p) => Number(p.n) > 0).map(({ label, w, h, n }) => ({ label, w: Number(w), h: Number(h), n: Number(n) })) })
    setC({ id: null, name: '', materialId: '', rollWidth: '', margin: 1, wastePct: '', note: '', pieces: [blank()] })
  }, 'Plantilla guardada')
  const loadTemplate = (t) => { setC({ id: t.id, name: t.name, materialId: t.material_id ?? '', rollWidth: t.roll_width_cm, margin: t.margin_cm, wastePct: t.waste_pct, note: t.note ?? '', pieces: (t.pieces ?? []).map((p) => ({ ...p, key: Math.random().toString(36).slice(2) })) }); window.scrollTo(0, 0) }

  // tiempos
  const [sf, setSf] = useState(null)
  const hour = Number(cfg?.labor_hour_cost) || 0
  const weights = [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <>
      <h2>Costos y tiempos</h2>
      <p className="muted small">Solo visible para la dueña. Acá se calcula el corte de tela y se definen los tiempos de elaboración y qué se cuenta en el costo.</p>
      <div className="chips">
        {[['corte', 'Corte de tela'], ['tiempos', 'Tiempos de elaboración'], ['criterios', 'Qué contar en el costo']].map(([k, l]) => (
          <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {error && <p className="alert">{error}</p>}
      {info && <p className="small" style={{ color: 'var(--accent)' }}>{info}</p>}

      {tab === 'corte' && (
        <>
          <div className="panel">
            <h3>{c.id ? 'Editando plantilla' : 'Calculadora de corte'}</h3>
            <div className="form-grid">
              <label>Nombre de la plantilla<input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Ej: Sandbag 5 kg" /></label>
              <label>Tela<select value={c.materialId} onChange={(e) => pickMat(e.target.value)}><option value="">— elegir —</option>{fabrics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
              <label>Ancho del rollo (cm)<input type="number" min="0" step="any" value={c.rollWidth} onChange={(e) => setC({ ...c, rollWidth: e.target.value })} /></label>
              <label>Margen de costura por lado (cm)<input type="number" min="0" step="any" value={c.margin} onChange={(e) => setC({ ...c, margin: e.target.value })} /></label>
              <label>Merma extra (%)<input type="number" min="0" max="99" step="any" value={c.wastePct} onChange={(e) => setC({ ...c, wastePct: e.target.value })} placeholder={mat ? `${fmtNum(mat.waste_pct)} (del insumo)` : '0'} />
                <small className="muted">Para recortes que no se aprovechan.</small></label>
            </div>
            <h4>Piezas (medidas terminadas, en cm)</h4>
            {c.pieces.map((p) => (
              <div key={p.key} className="row" style={{ marginBottom: '.4rem' }}>
                <input style={{ flex: '2 1 120px' }} placeholder="Pieza (cuerpo, asa…)" value={p.label} onChange={(e) => setPiece(p.key, { label: e.target.value })} />
                <input style={{ flex: '1 1 70px' }} type="number" min="0" step="any" placeholder="Ancho" value={p.w} onChange={(e) => setPiece(p.key, { w: e.target.value })} />
                <span>×</span>
                <input style={{ flex: '1 1 70px' }} type="number" min="0" step="any" placeholder="Alto" value={p.h} onChange={(e) => setPiece(p.key, { h: e.target.value })} />
                <input style={{ flex: '1 1 60px' }} type="number" min="1" step="1" title="Cantidad" value={p.n} onChange={(e) => setPiece(p.key, { n: e.target.value })} />
                <button type="button" className="link danger" onClick={() => setC((x) => ({ ...x, pieces: x.pieces.length > 1 ? x.pieces.filter((q) => q.key !== p.key) : x.pieces }))}>✕</button>
              </div>
            ))}
            <button type="button" className="btn ghost" onClick={() => setC((x) => ({ ...x, pieces: [...x.pieces, blank()] }))}>+ Pieza</button>

            <div className="stat-cards">
              {result.error ? <p className="muted">{result.error}</p> : (<>
                <div className="stat"><span>Largo de tela</span><b>{fmtNum(result.lengthCm)} cm</b></div>
                <div className="stat"><span>Metros a comprar{wastePct > 0 && cfg?.count_waste !== false ? ` (+${fmtNum(wastePct)}% merma)` : ''}</span><b>{fmtNum(meters, 3)} m</b></div>
                <div className="stat"><span>Sobrante estimado</span><b>{fmtNum(result.scrapPct, 1)}%</b></div>
                {unitCost > 0 && <div className="stat"><span>Costo de tela</span><b>{fmtMoney(meters * unitCost)}</b></div>}
              </>)}
            </div>
            <label>Notas<input value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} /></label>
            <div className="row" style={{ marginTop: '.7rem' }}>
              <button className="btn" onClick={saveTemplate}>Guardar plantilla</button>
              {c.id && <button className="btn ghost" onClick={() => setC({ id: null, name: '', materialId: '', rollWidth: '', margin: 1, wastePct: '', note: '', pieces: [blank()] })}>Nueva</button>}
            </div>
          </div>
          <h3>Plantillas guardadas</h3>
          {cuts.length === 0 && <p className="muted">Todavía no guardaste plantillas.</p>}
          <div className="item-list">
            {cuts.map((t) => (
              <div key={t.id} className="item" style={{ gridTemplateColumns: '1fr auto' }}>
                <div><b>{t.name}</b><span className="muted small">{mats.find((m) => m.id === t.material_id)?.name ?? 'Sin tela'} · rollo {fmtNum(t.roll_width_cm)} cm · {fmtNum(t.length_cm)} cm de largo · {fmtNum(metersWithWaste(t.length_cm, t.waste_pct), 3)} m con merma · {(t.pieces ?? []).reduce((n, p) => n + Number(p.n), 0)} piezas</span></div>
                <div className="actions"><button className="link" onClick={() => loadTemplate(t)}>Abrir</button><button className="link danger" onClick={() => confirm(`¿Eliminar “${t.name}”?`) && run(() => deleteCut(t.id))}>Eliminar</button></div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'tiempos' && (
        <>
          <p className="muted small">Minutos de cada etapa. “Por kg” sirve para lo que cambia con el peso, como la carga de arena o el relleno. Son tiempos de referencia que podés cambiar cuando quieras.</p>
          <button className="btn" onClick={() => setSf({ name: '', minutes_base: 0, minutes_per_kg: 0, active: true })}>+ Nueva etapa</button>
          {sf && (
            <form className="panel form-grid" style={{ marginTop: '1rem' }} onSubmit={(e) => { e.preventDefault(); run(async () => { await saveStep(sf); setSf(null) }, 'Guardado') }}>
              <label>Etapa<input value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} required /></label>
              <label>Minutos fijos<input type="number" min="0" step="any" value={sf.minutes_base} onChange={(e) => setSf({ ...sf, minutes_base: e.target.value })} /></label>
              <label>Minutos por kg<input type="number" min="0" step="any" value={sf.minutes_per_kg} onChange={(e) => setSf({ ...sf, minutes_per_kg: e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={sf.active} onChange={(e) => setSf({ ...sf, active: e.target.checked })} /> Se usa</label>
              <div className="row full"><button className="btn">Guardar</button><button type="button" className="btn ghost" onClick={() => setSf(null)}>Cancelar</button></div>
            </form>
          )}
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Etapa</th><th>Min. fijos</th><th>Min. por kg</th><th>Se usa</th><th></th></tr></thead>
            <tbody>{steps.map((s) => (
              <tr key={s.id}><td><b>{s.name}</b></td><td>{fmtNum(s.minutes_base)}</td><td>{fmtNum(s.minutes_per_kg)}</td><td>{s.active ? 'Sí' : 'No'}</td>
                <td className="actions"><button className="link" onClick={() => setSf({ ...s })}>Editar</button>
                  <button className="link danger" onClick={() => confirm(`¿Eliminar “${s.name}”?`) && run(() => deleteStep(s.id))}>Eliminar</button></td></tr>
            ))}</tbody></table></div>
          <h3>Tiempo por peso</h3>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Peso</th><th>Tiempo total</th><th>Mano de obra{cfg?.count_labor ? '' : ' (no se cuenta)'}</th></tr></thead>
            <tbody>{weights.map((w) => { const l = laborFor(steps, w, hour); return (
              <tr key={w}><td>{w} kg</td><td>{Math.floor(l.minutes / 60) > 0 && `${Math.floor(l.minutes / 60)} h `}{fmtNum(l.minutes % 60, 0)} min</td><td>{hour > 0 ? fmtMoney(l.cost) : '—'}</td></tr>) })}</tbody></table></div>
          {hour === 0 && <p className="muted small">Cargá el valor de la hora en “Qué contar en el costo” para ver el costo de mano de obra.</p>}
        </>
      )}

      {tab === 'criterios' && cfg && (
        <form className="panel form-grid" onSubmit={(e) => { e.preventDefault(); run(() => saveCostSettings(cfg), 'Criterios guardados') }}>
          <h3 className="full">Qué entra en el costo y el balance</h3>
          <label className="check full"><input type="checkbox" checked={cfg.count_labor} onChange={(e) => setCfg({ ...cfg, count_labor: e.target.checked })} /> Contar la mano de obra (tiempo de elaboración) en el costo de los productos</label>
          <label>Valor de la hora de trabajo ($)<input type="number" min="0" step="any" value={cfg.labor_hour_cost} onChange={(e) => setCfg({ ...cfg, labor_hour_cost: e.target.value })} /></label>
          <label className="check full"><input type="checkbox" checked={cfg.count_waste} onChange={(e) => setCfg({ ...cfg, count_waste: e.target.checked })} /> Contar la merma orientativa (recortes y sobrantes) en el costo de los insumos</label>
          <p className="muted small full">Estos criterios los van a usar las recetas y el balance de las próximas etapas. Podés cambiarlos cuando quieras sin perder datos: el costo de los pedidos ya vendidos queda congelado.</p>
          <div className="row full"><button className="btn">Guardar criterios</button></div>
        </form>
      )}
    </>
  )
}
