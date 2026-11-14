import { useEffect, useMemo, useState } from 'react'
import { listAuditFull, listUserNames } from '../lib/insumos'
import { fmtDate, fmtMoney } from '../lib/format'

const TABLES = { products: 'Productos', orders: 'Pedidos', materials: 'Insumos', suppliers: 'Proveedores', profiles: 'Usuarios', site_settings: 'Apariencia / ajustes', news: 'Noticias', activities: 'Actividades', categories: 'Categorías', cut_templates: 'Plantillas de corte', labor_steps: 'Tiempos de elaboración', cost_settings: 'Criterios de costo' }
const FIELD = { price: 'Precio', stock: 'Stock', active: 'Visibilidad', name: 'Nombre', status: 'Estado', role: 'Rol', min_stock: 'Stock mínimo', unit: 'Unidad', category: 'Categoría', phone: 'Teléfono', notes: 'Notas' }
const ACTION = { INSERT: 'Alta', UPDATE: 'Cambio', DELETE: 'Baja' }
const MONEY = ['price', 'avg_cost', 'last_cost']

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

export default function Auditoria() {
  const [rows, setRows] = useState(null)
  const [names, setNames] = useState({})
  const [f, setF] = useState({ table: '', action: '', from: '', to: '', q: '' })
  const [error, setError] = useState('')

  useEffect(() => { listUserNames().then(setNames).catch(() => {}) }, [])
  useEffect(() => {
    setRows(null)
    listAuditFull({ table: f.table, action: f.action, from: f.from, to: f.to }).then(setRows).catch((e) => setError(e.message))
  }, [f.table, f.action, f.from, f.to])

  const who = (r) => names[r.changed_by] ?? (r.changed_by ? String(r.changed_by).slice(0, 8) : 'sistema')
  const val = (r, v) => (v == null || v === '' ? '—' : MONEY.includes(r.field) ? fmtMoney(v) : String(v))
  const detail = (r) => {
    if (r.action === 'UPDATE') return null
    const d = r.action === 'INSERT' ? r.new_data : r.old_data
    if (!d) return ''
    return Object.entries(d).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).slice(0, 6).map(([k, v]) => `${FIELD[k] ?? k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')
  }

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return (rows ?? []).filter((r) => !q || `${r.context} ${r.field} ${r.old_value} ${r.new_value} ${who(r)}`.toLowerCase().includes(q))
  }, [rows, f.q, names]) // eslint-disable-line

  const exportCsv = () => {
    const head = ['Fecha', 'Usuario', 'Sección', 'Registro', 'Acción', 'Campo', 'Antes', 'Después']
    const lines = shown.map((r) => [fmtDate(r.changed_at), who(r), TABLES[r.table_name] ?? r.table_name, r.context, ACTION[r.action], FIELD[r.field] ?? r.field ?? '', r.old_value ?? '', r.new_value ?? detail(r) ?? ''].map(csvCell).join(','))
    const blob = new Blob(['﻿' + [head.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  return (
    <>
      <div className="row between"><h2>Auditoría de cambios</h2><button className="btn ghost" onClick={exportCsv} disabled={!shown.length}>Exportar CSV</button></div>
      <p className="muted small">Quién cambió qué y cuándo: productos, pedidos, insumos, proveedores, usuarios, ajustes, noticias y actividades.</p>
      <div className="panel form-grid">
        <label>Sección<select value={f.table} onChange={(e) => setF({ ...f, table: e.target.value })}><option value="">Todas</option>{Object.entries(TABLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Acción<select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })}><option value="">Todas</option>{Object.entries(ACTION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Desde<input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
        <label>Hasta<input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
        <label className="full">Buscar<input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Nombre, usuario, valor…" /></label>
      </div>
      {error && <p className="alert">{error}</p>}
      {!rows && !error && <p className="muted">Cargando…</p>}
      {rows && shown.length === 0 && <p className="muted">No hay cambios con esos filtros.</p>}
      <p className="muted small">{shown.length} registros (máx. 500 por consulta)</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Usuario</th><th>Sección</th><th>Registro</th><th>Acción</th><th>Antes</th><th>Después</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.changed_at)}</td><td>{who(r)}</td><td>{TABLES[r.table_name] ?? r.table_name}</td><td>{r.context}</td>
                <td>{r.action === 'UPDATE' ? FIELD[r.field] ?? r.field : ACTION[r.action]}</td>
                {r.action === 'UPDATE'
                  ? <><td>{val(r, r.old_value)}</td><td>{val(r, r.new_value)}</td></>
                  : r.action === 'INSERT' ? <><td>—</td><td className="small">{detail(r)}</td></> : <><td className="small">{detail(r)}</td><td>—</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
