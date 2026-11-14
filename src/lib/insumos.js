// Insumos, proveedores, compras, precios, auditoría y visitas (etapa 5).
// Usa Supabase si está configurado; si no, el cliente demo (localStorage). Todas las consultas son "planas" (sin joins).
import { supabase, hasSupabase } from './supabase'
import { demoDb } from './demoDb'

const db = () => (hasSupabase ? supabase : demoDb)
export const COST_TABLES = ['suppliers', 'materials', 'purchases', 'supplier_prices', 'cut_templates', 'labor_steps', 'cost_settings']
const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data }

/* ---------- Proveedores ---------- */
// acepta "miproveedor.com.ar" y lo deja como "https://miproveedor.com.ar"; solo permite http/https
export function normalizeWebsite(v) {
  const t = String(v ?? '').trim()
  if (!t) return ''
  const url = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : 'https://' + t
  let u
  try { u = new URL(url) } catch { throw new Error('El enlace a la página web no es válido') }
  if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new Error('El enlace a la página web no es válido (ej: https://proveedor.com.ar)')
  return u.href
}
export const listSuppliers = async () => ok(await db().from('suppliers').select('*').order('name'))
export async function saveSupplier(s) {
  const row = { name: s.name.trim(), phone: s.phone?.trim() ?? '', website: normalizeWebsite(s.website), notes: s.notes?.trim() ?? '', active: s.active !== false }
  if (!row.name) throw new Error('Ingresá el nombre del proveedor')
  if (s.id) ok(await db().from('suppliers').update(row).eq('id', s.id))
  else ok(await db().from('suppliers').insert(row))
}
export async function deleteSupplier(id) { ok(await db().from('suppliers').delete().eq('id', id)) }

/* ---------- Insumos ---------- */
export const listMaterials = async () => ok(await db().from('materials').select('*').order('name'))
export async function saveMaterial(m) {
  const row = {
    name: m.name.trim(), category: m.category?.trim() || 'otro', unit: m.unit, min_stock: Number(m.min_stock) || 0,
    width_cm: m.width_cm === '' || m.width_cm == null ? null : Number(m.width_cm),
    waste_pct: Math.min(Math.max(Number(m.waste_pct) || 0, 0), 99), active: m.active !== false, notes: m.notes ?? ''
  }
  if (!row.name) throw new Error('Ingresá el nombre del insumo')
  if (m.id) ok(await db().from('materials').update(row).eq('id', m.id))
  else ok(await db().from('materials').insert(row))
}
export async function deleteMaterial(id) { ok(await db().from('materials').delete().eq('id', id)) }

export async function adjustStock({ materialId, delta, kind, note }) {
  return ok(await db().rpc('adjust_material_stock', { p_material: materialId, p_delta: delta, p_kind: kind, p_note: note || '' }))
}
export const listMovements = async (materialId) =>
  ok(await db().from('material_movements').select('*').eq('material_id', materialId).order('created_at', { ascending: false }).limit(200))

/* ---------- Precios por proveedor ---------- */
export const listPrices = async () => ok(await db().from('supplier_prices').select('*').order('created_at', { ascending: false }).limit(3000))
export async function addPrice({ materialId, supplierId, price, note }) {
  if (!materialId || !supplierId) throw new Error('Elegí proveedor e insumo')
  if (!(Number(price) >= 0) || price === '') throw new Error('Ingresá un precio válido')
  ok(await db().from('supplier_prices').insert({ material_id: materialId, supplier_id: supplierId, price: Number(price), source: 'cotizacion', note: note ?? '' }))
}

export async function updatePrice(id, { price, note }) {
  if (!(Number(price) >= 0) || price === '') throw new Error('Ingresá un precio válido')
  ok(await db().from('supplier_prices').update({ price: Number(price), note: note ?? '' }).eq('id', id))
}
export async function deletePrice(id) { ok(await db().from('supplier_prices').delete().eq('id', id)) }

// último precio de cada (insumo, proveedor) y el anterior, para ver variaciones
export function priceMatrix(prices) {
  const by = {}
  for (const p of prices) { // prices viene del más nuevo al más viejo
    const k = p.material_id + '|' + p.supplier_id
    ;(by[k] ??= []).push(p)
  }
  const latest = {}
  for (const [k, arr] of Object.entries(by)) {
    const cur = arr[0]; const prev = arr[1]
    latest[k] = { ...cur, prev: prev?.price ?? null, change: prev ? ((cur.price - prev.price) / prev.price) * 100 : null }
  }
  return latest
}

/* ---------- Compras ---------- */
export async function registerPurchase({ supplierId, date, ref, notes, items, shipping }) {
  if (!items.length) throw new Error('Agregá al menos un insumo')
  return ok(await db().rpc('register_purchase', {
    p_supplier: supplierId || null, p_date: date || null, p_ref: ref || '', p_notes: notes || '',
    p_shipping: Number(shipping) || 0,
    p_items: items.map((i) => ({
      material_id: i.materialId, qty: Number(i.qty) || 0, qty_missing: Number(i.missing) || 0, unit_price: Number(i.price),
      width_cm: i.width === '' || i.width == null ? null : Number(i.width), size_note: i.sizeNote || ''
    }))
  }))
}
// corrige los datos de la compra (proveedor, fecha, factura, notas); las cantidades y el stock no se tocan
export async function updatePurchase(id, { supplierId, date, ref, notes }) {
  ok(await db().from('purchases').update({ supplier_id: supplierId || null, purchase_date: date, invoice_ref: ref ?? '', notes: notes ?? '' }).eq('id', id))
}
export const listPurchases = async () => ok(await db().from('purchases').select('*').order('created_at', { ascending: false }).limit(300))
export async function listPurchaseItems(purchaseIds) {
  if (!purchaseIds.length) return []
  return ok(await db().from('purchase_items').select('*').in('purchase_id', purchaseIds))
}

/* ---------- Cortes de tela, tiempos y criterios de costo (solo dueña) ---------- */
export const listCuts = async () => ok(await db().from('cut_templates').select('*').order('name'))
export async function saveCut(c) {
  const row = {
    name: c.name.trim(), material_id: c.material_id || null, roll_width_cm: Number(c.roll_width_cm), margin_cm: Number(c.margin_cm) || 0,
    pieces: c.pieces, length_cm: Number(c.length_cm), waste_pct: Number(c.waste_pct) || 0, note: c.note ?? ''
  }
  if (!row.name) throw new Error('Poné un nombre a la plantilla')
  if (c.id) ok(await db().from('cut_templates').update(row).eq('id', c.id))
  else ok(await db().from('cut_templates').insert(row))
}
export async function deleteCut(id) { ok(await db().from('cut_templates').delete().eq('id', id)) }

export const listSteps = async () => ok(await db().from('labor_steps').select('*').order('sort'))
export async function saveStep(s) {
  const row = { name: s.name.trim(), minutes_base: Math.max(Number(s.minutes_base) || 0, 0), minutes_per_kg: Math.max(Number(s.minutes_per_kg) || 0, 0), sort: Number(s.sort) || 99, active: s.active !== false }
  if (!row.name) throw new Error('Poné un nombre a la etapa')
  if (s.id) ok(await db().from('labor_steps').update(row).eq('id', s.id))
  else ok(await db().from('labor_steps').insert(row))
}
export async function deleteStep(id) { ok(await db().from('labor_steps').delete().eq('id', id)) }
export async function getCostSettings() {
  const r = ok(await db().from('cost_settings').select('*').eq('id', 1).maybeSingle())
  return r ?? { id: 1, labor_hour_cost: 0, count_labor: false, count_waste: true }
}
export async function saveCostSettings(c) {
  ok(await db().from('cost_settings').update({ labor_hour_cost: Math.max(Number(c.labor_hour_cost) || 0, 0), count_labor: !!c.count_labor, count_waste: !!c.count_waste }).eq('id', 1))
}

/* ---------- Auditoría ---------- */
export async function listAuditFull({ table, action, from, to, limit = 500 } = {}) {
  let q = db().from('audit_log').select('*')
  if (table) q = q.eq('table_name', table)
  if (action) q = q.eq('action', action)
  if (from) q = q.gte('changed_at', from + 'T00:00:00')
  if (to) q = q.lte('changed_at', to + 'T23:59:59')
  let rows = ok(await q.order('changed_at', { ascending: false }).limit(limit))
  if (!hasSupabase && !['duena', 'admin'].includes(localStorage.getItem('vm_demo_role'))) rows = rows.filter((r) => !COST_TABLES.includes(r.table_name))
  if (!hasSupabase) { // en demo también se muestran los cambios de precio/stock de productos (guardados aparte)
    try {
      const legacy = JSON.parse(localStorage.getItem('vm_audit') ?? '[]').map((r) => ({ ...r, changed_by: localStorage.getItem('vm_demo_role') || 'demo' }))
      rows = [...rows, ...legacy.filter((r) => (!table || r.table_name === table) && (!action || r.action === action))]
        .sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1))
    } catch { /* sin datos previos */ }
  }
  return rows
}
// nombres de quienes hicieron cambios
export async function listUserNames() {
  if (!hasSupabase) return {}
  const rows = ok(await supabase.from('profiles').select('id, full_name, email'))
  return Object.fromEntries(rows.map((r) => [r.id, r.full_name || r.email]))
}

/* ---------- Visitas ---------- */
export async function logVisit(args) {
  try { await db().rpc('log_visit', args) } catch { /* nunca debe romper la página */ }
}
export async function listVisits(sinceISO) {
  return ok(await db().from('page_views').select('*').gte('created_at', sinceISO).order('created_at', { ascending: false }).limit(5000))
}
