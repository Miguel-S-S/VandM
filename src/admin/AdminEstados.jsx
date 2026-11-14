import { useEffect, useState } from 'react'
import { listStatuses, saveStatuses, deleteStatus, countOrdersByStatus, newStatusKey, PROTECTED, useStatuses } from '../lib/statuses'
import { useConfirm } from '../components/Confirm'

// Edita las etapas por las que pasa un pedido: nombre, color, orden, si se usa y si cuenta como "en curso".
export default function AdminEstados() {
  const { reload } = useStatuses()
  const ask = useConfirm()
  const [list, setList] = useState(null)
  const [orig, setOrig] = useState([])
  const [counts, setCounts] = useState({})
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const l = await listStatuses()
      setList(l.map((s) => ({ ...s }))); setOrig(l)
      setCounts(await countOrdersByStatus())
    } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const dirty = list && JSON.stringify(list) !== JSON.stringify(orig)
  const set = (key, patch) => setList((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const move = (i, d) => setList((l) => {
    const a = [...l]; const j = i + d
    if (j < 0 || j >= a.length) return l;
    [a[i], a[j]] = [a[j], a[i]]
    return a.map((s, k) => ({ ...s, position: k + 1 }))
  })
  const add = () => {
    const label = newLabel.trim()
    if (!label) return setError('Escribí el nombre del estado nuevo')
    if (list.some((s) => s.label.toLowerCase() === label.toLowerCase())) return setError('Ya existe un estado con ese nombre')
    setError('')
    // entra antes de "Entregado"/"Cancelado" para que quede dentro del avance normal
    const at = list.findIndex((s) => ['entregado', 'cancelado'].includes(s.key))
    const item = { key: newStatusKey(label, list), label, color: '#8b5cf6', position: 0, active: true, inProgress: true }
    const a = [...list]; a.splice(at < 0 ? a.length : at, 0, item)
    setList(a.map((s, k) => ({ ...s, position: k + 1 })))
    setNewLabel('')
  }

  const save = async () => {
    setError(''); setInfo('')
    if (list.some((s) => !s.label.trim())) return setError('Ningún estado puede quedar sin nombre')
    const added = list.filter((s) => !orig.some((o) => o.key === s.key))
    const same = (o, s) => o.label === s.label && o.color === s.color && o.active === s.active && o.inProgress === s.inProgress
    const changed = list.filter((s) => { const o = orig.find((x) => x.key === s.key); return o && !same(o, s) })
    const reordered = list.filter((s) => orig.some((o) => o.key === s.key)).map((s) => s.key).join() !== orig.filter((o) => list.some((s) => s.key === o.key)).map((o) => o.key).join()
    const lines = [...added.map((s) => `Alta: «${s.label}»`),
      ...changed.map((s) => { const o = orig.find((x) => x.key === s.key); return `Modifica: «${o.label}»${o.label !== s.label ? ` → «${s.label}»` : ''}${o.active !== s.active ? (s.active ? ' (se activa)' : ' (se desactiva)') : ''}` }),
      ...(reordered ? ['Cambia el orden de las etapas'] : [])]
    if (!(await ask.custom({ title: 'Confirmar modificación', message: '¿Guardar los cambios en los estados del pedido?', lines: lines.slice(0, 8), confirmText: 'Sí, guardar' }))) return
    setBusy(true)
    try { await saveStatuses(list.map((s, k) => ({ ...s, position: k + 1 }))); await load(); await reload(); setInfo('Estados guardados') } catch (e) { setError(e.message) }
    setBusy(false)
  }
  const del = async (s) => {
    setError(''); setInfo('')
    if (!orig.some((o) => o.key === s.key)) { setList((l) => l.filter((x) => x.key !== s.key)); return } // todavía no se había guardado
    if (!(await ask.remove(`el estado «${s.label}»`))) return
    try { await deleteStatus(s.key); await load(); await reload(); setInfo('Estado eliminado') } catch (e) { setError(e.message) }
  }

  return (
    <>
      <h2>Estados del pedido</h2>
      <p className="muted small">Son las etapas que ve el cliente en “Mis pedidos” y que usás en el panel. Podés renombrarlas, cambiar el color, reordenarlas, sumar nuevas o desactivar las que no uses.
        “En curso” define si el pedido aparece en la vista “En curso” y en el calendario. «Recibido» y «Cancelado» las usa el sistema (el stock vuelve al cancelar): se pueden renombrar pero no eliminar.</p>
      {error && <p className="alert">{error}</p>}
      {info && <p className="small" style={{ color: 'var(--accent)' }}>{info}</p>}
      {!list && !error && <p className="muted">Cargando…</p>}

      <div className="item-list">
        {list?.map((s, i) => (
          <div key={s.key} className={'status-row' + (s.active ? '' : ' off')}>
            <input type="color" value={s.color} onChange={(e) => set(s.key, { color: e.target.value })} aria-label="Color" />
            <div>
              <input value={s.label} onChange={(e) => set(s.key, { label: e.target.value })} aria-label="Nombre del estado" />
              <span className="muted small">{counts[s.key] ? `${counts[s.key]} pedido(s)` : 'sin pedidos'}{PROTECTED.includes(s.key) && ' · del sistema'}</span>
            </div>
            <div className="row" style={{ gap: '.8rem' }}>
              <label className="check small"><input type="checkbox" checked={s.active} onChange={(e) => set(s.key, { active: e.target.checked })} /> Se usa</label>
              <label className="check small"><input type="checkbox" checked={s.inProgress} onChange={(e) => set(s.key, { inProgress: e.target.checked })} /> En curso</label>
            </div>
            <div className="actions">
              <button className="link" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
              <button className="link" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Bajar">↓</button>
              {!PROTECTED.includes(s.key) && <button className="link danger" onClick={() => del(s)}>Eliminar</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: '1rem' }}>
        <input style={{ maxWidth: 280 }} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nuevo estado (ej: En camino)"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button className="btn ghost" onClick={add}>+ Agregar estado</button>
      </div>
      <div className="row" style={{ marginTop: '1rem' }}>
        <button className="btn" onClick={save} disabled={!dirty || busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        {dirty && <button className="btn ghost" onClick={load}>Descartar cambios</button>}
        {dirty && <span className="muted small">Hay cambios sin guardar</span>}
      </div>
    </>
  )
}
