import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

// Ventana de confirmación única para todo el sitio.
// Uso:  const ask = useConfirm();   if (!(await ask.save('el proveedor “X”', isNew))) return
const Ctx = createContext(null)
export const useConfirm = () => useContext(Ctx)

export function ConfirmProvider({ children }) {
  const [st, setSt] = useState(null)
  const resolver = useRef(null)
  const okBtn = useRef(null)

  const custom = useCallback((opts) => new Promise((resolve) => {
    resolver.current?.(false)
    resolver.current = resolve
    setSt(typeof opts === 'string' ? { message: opts } : opts)
  }), [])
  const close = (v) => { resolver.current?.(v); resolver.current = null; setSt(null) }

  const api = useMemo(() => {
    const create = (what, lines) => custom({ title: 'Confirmar alta', message: `¿Querés agregar ${what}?`, confirmText: 'Sí, agregar', lines })
    const update = (what, lines) => custom({ title: 'Confirmar modificación', message: `¿Querés guardar los cambios en ${what}?`, confirmText: 'Sí, guardar', lines })
    const remove = (what, extra) => custom({ title: 'Confirmar baja', message: `¿Querés eliminar ${what}?${extra ? ' ' + extra : ''}`, confirmText: 'Sí, eliminar', danger: true })
    const save = (what, isNew, lines) => (isNew ? create(what, lines) : update(what, lines))
    return { custom, create, update, remove, save }
  }, [custom])

  useEffect(() => {
    if (!st) return undefined
    const onKey = (e) => { if (e.key === 'Escape') close(false) }
    window.addEventListener('keydown', onKey)
    okBtn.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [st])

  return (
    <Ctx.Provider value={api}>
      {children}
      {st && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="cf-title">
            <h3 id="cf-title">{st.title ?? 'Confirmar'}</h3>
            <p>{st.message}</p>
            {st.lines?.length > 0 && <ul className="plain small muted">{st.lines.map((l, i) => <li key={i}>• {l}</li>)}</ul>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn ghost" onClick={() => close(false)}>{st.cancelText ?? 'Cancelar'}</button>
              <button type="button" ref={okBtn} className={'btn' + (st.danger ? ' danger-btn' : '')} onClick={() => close(true)}>{st.confirmText ?? 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
