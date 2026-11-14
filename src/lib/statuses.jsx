// Estados del pedido EDITABLES (tabla order_statuses). Si la tabla todavía no existe, usa los de fábrica.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase } from './supabase'
import { STATUSES as DEFAULTS } from './orders'
import { slugify } from './data'

const LS = 'vm_statuses'
// 'recibido' (estado inicial de todo pedido nuevo) y 'cancelado' (devuelve el stock) los usa el sistema: se pueden renombrar, no borrar.
export const PROTECTED = ['recibido', 'cancelado']

const FALLBACK = DEFAULTS.map((s, i) => ({ key: s.key, label: s.label, color: s.color, position: i + 1, active: true, inProgress: !['entregado', 'cancelado'].includes(s.key) }))
const map = (r) => ({ key: r.key, label: r.label, color: r.color || '#a3a3a3', position: r.position ?? 0, active: r.active !== false, inProgress: r.in_progress !== false })
const sortFn = (a, b) => a.position - b.position

export async function listStatuses() {
  if (!hasSupabase) {
    try { const v = JSON.parse(localStorage.getItem(LS)); if (v?.length) return v.sort(sortFn) } catch { /* usa los de fábrica */ }
    return FALLBACK
  }
  const { data, error } = await supabase.from('order_statuses').select('*').order('position')
  if (error || !data?.length) return FALLBACK // tabla aún no creada
  return data.map(map)
}

export async function saveStatuses(list) {
  if (!hasSupabase) { localStorage.setItem(LS, JSON.stringify(list)); return }
  const rows = list.map((s) => ({ key: s.key, label: s.label.trim(), color: s.color, position: s.position, active: s.active, in_progress: s.inProgress, updated_at: new Date().toISOString() }))
  const { error } = await supabase.from('order_statuses').upsert(rows)
  if (error) throw new Error(error.message.includes('order_statuses') ? 'Falta crear la tabla de estados: ejecutá supabase/etapa6.sql en Supabase' : error.message)
}

export const newStatusKey = (label, list) => {
  const base = slugify(label).replace(/-/g, '_') || 'estado'
  let k = base; let n = 2
  while (list.some((s) => s.key === k)) k = `${base}_${n++}`
  return k
}

export async function countOrdersByStatus() {
  const counts = {}
  if (!hasSupabase) {
    try { JSON.parse(localStorage.getItem('vm_orders') ?? '[]').forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1 }) } catch { /* sin pedidos */ }
    return counts
  }
  const { data, error } = await supabase.from('orders').select('status').limit(5000)
  if (error) throw new Error(error.message)
  data.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1 })
  return counts
}

export async function deleteStatus(key) {
  if (PROTECTED.includes(key)) throw new Error('Ese estado lo usa el sistema: podés renombrarlo o cambiarle el color, pero no eliminarlo')
  const used = (await countOrdersByStatus())[key] ?? 0
  if (used) throw new Error(`Hay ${used} pedido(s) en ese estado. Pasalos a otro estado o desactivá este estado en lugar de eliminarlo`)
  if (!hasSupabase) { localStorage.setItem(LS, JSON.stringify((await listStatuses()).filter((s) => s.key !== key))); return }
  const { error } = await supabase.from('order_statuses').delete().eq('key', key)
  if (error) throw new Error(error.message)
}

const Ctx = createContext(null)
export const useStatuses = () => useContext(Ctx)

export function StatusProvider({ children }) {
  const [all, setAll] = useState(FALLBACK)
  const reload = useCallback(() => listStatuses().then((l) => setAll(l.slice().sort(sortFn))).catch(() => {}), [])
  useEffect(() => { reload() }, [reload])

  const value = useMemo(() => {
    const active = all.filter((s) => s.active)
    const statusOf = (k) => all.find((s) => s.key === k) ?? { key: k, label: String(k ?? '—').replace(/_/g, ' '), color: '#a3a3a3', active: false, inProgress: false }
    return {
      all, active, statusOf, reload,
      inProgressKeys: all.filter((s) => s.inProgress).map((s) => s.key),
      // etapas de la barra de avance: las activas, menos "cancelado"
      steps: active.filter((s) => s.key !== 'cancelado')
    }
  }, [all, reload])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
