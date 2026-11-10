import { useEffect, useState } from 'react'
import { listAudit } from '../lib/data'
import { fmtDate, fmtMoney } from '../lib/format'

const FIELD = { price: 'Precio', stock: 'Stock', active: 'Visibilidad', name: 'Nombre' }

export default function Auditoria() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { listAudit().then(setRows).catch((e) => setError(e.message)) }, [])

  const show = (field, v) => (v == null ? '—' : field === 'price' ? fmtMoney(v) : v)

  return (
    <>
      <h2>Auditoría de cambios</h2>
      <p className="muted small">Registro de cambios de precio, stock, nombre y visibilidad (últimos 300).</p>
      {error && <p className="alert">{error}</p>}
      {rows && rows.length === 0 && <p className="muted">Todavía no hay cambios registrados.</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Producto</th><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.changed_at)}</td>
                <td>{r.context}</td>
                <td>{r.action === 'INSERT' ? 'Alta' : r.action === 'DELETE' ? 'Baja' : FIELD[r.field] ?? r.field}</td>
                <td>{show(r.field, r.old_value)}</td>
                <td>{show(r.field, r.new_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
