import { useEffect, useState } from 'react'
import { listCategories, saveCategory, deleteCategory } from '../lib/data'
import { useConfirm } from '../components/Confirm'

export default function AdminCategorias() {
  const ask = useConfirm()
  const [list, setList] = useState(null)
  const [name, setName] = useState('')
  const [edit, setEdit] = useState(null)
  const [error, setError] = useState('')
  const load = () => listCategories().then(setList).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const run = async (fn) => { setError(''); try { await fn(); await load() } catch (e) { setError(e.message) } }

  return (
    <>
      <h2>Categorías</h2>
      <p className="muted small">Son las secciones de la tienda (Tobilleras, Sandbags…). Podés agregar nuevas o renombrarlas.</p>
      {error && <p className="alert">{error}</p>}
      <form className="row" onSubmit={async (e) => { e.preventDefault(); if (name.trim() && await ask.create(`la categoría «${name.trim()}»`)) run(async () => { await saveCategory({ name: name.trim() }); setName('') }) }}>
        <input style={{ maxWidth: 320 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría (ej: Mancuernas)" />
        <button className="btn">+ Agregar</button>
      </form>
      <div className="item-list" style={{ marginTop: '1rem' }}>
        {list?.map((c) => (
          <div key={c.id} className="item" style={{ gridTemplateColumns: '1fr auto' }}>
            {edit?.id === c.id ? (
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            ) : <b>{c.name}</b>}
            <div className="actions">
              {edit?.id === c.id ? (
                <>
                  <button className="link" onClick={async () => { if (edit.name.trim() === c.name) return setEdit(null); if (await ask.update(`la categoría «${c.name}»`, [`Nombre: ${c.name} → ${edit.name.trim()}`])) run(async () => { await saveCategory({ ...c, name: edit.name }); setEdit(null) }) }}>Guardar</button>
                  <button className="link muted" onClick={() => setEdit(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <button className="link" onClick={() => setEdit({ id: c.id, name: c.name })}>Renombrar</button>
                  <button className="link danger" onClick={async () => (await ask.remove(`la categoría «${c.name}»`, 'Sus productos quedarán sin categoría.')) && run(() => deleteCategory(c))}>Eliminar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
