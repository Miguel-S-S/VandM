import { coverOf } from '../lib/images'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listProducts, deleteProduct, resetDemo } from '../lib/data'
import { useAuth } from '../lib/auth'
import { fmtMoney } from '../lib/format'
import { Photo } from '../components/ProductCard'
import { useConfirm } from '../components/Confirm'
import { hasPromo } from '../lib/pricing'

export default function AdminProductos() {
  const ask = useConfirm()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const { demo } = useAuth()
  const load = () => listProducts().then(setList).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const del = async (p) => {
    if (!(await ask.remove(`«${p.name}»`, p.isCombo ? '' : 'Se borran también todas sus variantes (pesos).'))) return
    try { await deleteProduct(p.id); load() } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="row between">
        <h2>Productos</h2>
        <Link to="/admin/productos/nuevo" className="btn">+ Nuevo producto</Link>
      </div>
      {error && <p className="alert">{error}</p>}
      {!list && <p className="muted">Cargando…</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Variantes</th><th>Precio desde</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {list?.map((p) => {
              const prices = p.variants.map((v) => v.price)
              return (
                <tr key={p.id}>
                  <td className="thumb-cell"><Photo src={coverOf(p.images)} alt="" /></td>
                  <td><b>{p.name}</b>{p.isCombo && <span className="pill" style={{ marginLeft: '.4rem', background: '#3b82f6', color: '#fff' }}>Combo</span>}{hasPromo(p) && <span className="pill" style={{ marginLeft: '.4rem', background: 'var(--danger)', color: '#fff' }}>Oferta</span>}</td>
                  <td>{p.categoryName ?? p.category ?? '—'}</td>
                  <td>{p.variants.length}</td>
                  <td>{prices.length ? fmtMoney(Math.min(...prices)) : '—'}</td>
                  <td>{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
                  <td><span className={'pill ' + (p.active ? 'ok' : 'off')}>{p.active ? 'Activo' : 'Oculto'}</span></td>
                  <td className="actions">
                    <Link to={`/admin/productos/${p.id}`} className="link">Editar</Link>
                    <button className="link danger" onClick={() => del(p)}>Eliminar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {demo && (
        <button className="link muted" onClick={async () => { if (await ask.custom({ title: 'Restaurar datos', message: '¿Restaurar los datos de ejemplo? Se pierden los cambios locales.', confirmText: 'Sí, restaurar', danger: true })) { resetDemo(); load() } }}>
          Restaurar datos de ejemplo
        </button>
      )}
    </>
  )
}
