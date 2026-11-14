// Cliente mínimo, compatible con la parte de supabase-js que usan los módulos de insumos/compras/auditoría/visitas.
// Se usa SOLO en modo demo (sin Supabase). Guarda todo en localStorage.
import { uid } from './format'

const KEY = 'vm_demo_db'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {} } catch { return {} } }
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d))
const now = () => new Date().toISOString()

const SEED_MATERIALS = [
  ['Arena', 'arena', 'kg', 50], ['Tela lona', 'tela', 'm', 5], ['Hilo', 'hilo', 'u', 3], ['Cierres', 'cierre', 'u', 10], ['Velcro', 'cierre', 'm', 3],
  ['Cinta mochilera', 'cinta', 'm', 10], ['Cinta adhesiva', 'embalaje', 'u', 2], ['Bolsa 30x40', 'embalaje', 'u', 20], ['Bolsa 40x60', 'embalaje', 'u', 20]
]
const SEED_STEPS = [['Corte de tela', 10, 0], ['Costura', 25, 0], ['Carga de arena', 5, 3], ['Relleno', 5, 2], ['Terminación y embalaje', 5, 0]]
function data() {
  const d = load()
  if (!d.materials) {
    d.materials = SEED_MATERIALS.map(([name, category, unit, min_stock]) => ({
      id: uid(), name, category, unit, stock: 0, min_stock, avg_cost: 0, last_cost: 0, width_cm: null, waste_pct: 0, active: true, notes: '', created_at: now()
    }))
    save(d)
  }
  if (!d.labor_steps) {
    d.labor_steps = SEED_STEPS.map(([name, minutes_base, minutes_per_kg], i) => ({ id: uid(), name, minutes_base, minutes_per_kg, sort: i + 1, active: true }))
    d.cost_settings = [{ id: 1, labor_hour_cost: 0, count_labor: false, count_waste: true }]
    save(d)
  }
  return d
}

const DEFAULTS = {
  suppliers: { phone: '', notes: '', active: true },
  materials: { category: 'otro', unit: 'u', stock: 0, min_stock: 0, avg_cost: 0, last_cost: 0, width_cm: null, waste_pct: 0, active: true, notes: '' },
  labor_steps: { minutes_base: 0, minutes_per_kg: 0, sort: 99, active: true },
  cut_templates: { margin_cm: 0, waste_pct: 0, pieces: [], note: '' },
  supplier_prices: { source: 'cotizacion', note: '' }
}
// tablas auditadas y campos ignorados (igual que en la base real)
const AUDITED = { suppliers: ['name', []], materials: ['name', ['stock', 'avg_cost', 'last_cost']], cut_templates: ['name', []], labor_steps: ['name', []], cost_settings: ['id', []] }
const actor = () => localStorage.getItem('vm_demo_role') || 'demo'

function audit(d, table, op, oldRow, newRow) {
  if (!AUDITED[table]) return
  const [label, skip] = AUDITED[table]
  d.audit_log ??= []
  const base = { id: uid(), table_name: table, changed_by: actor(), changed_at: now() }
  if (op === 'INSERT') d.audit_log.unshift({ ...base, record_id: newRow.id, action: 'INSERT', context: newRow[label], new_data: newRow })
  else if (op === 'DELETE') d.audit_log.unshift({ ...base, record_id: oldRow.id, action: 'DELETE', context: oldRow[label], old_data: oldRow })
  else Object.keys(newRow).forEach((k) => {
    if (['created_at', 'updated_at', ...skip].includes(k)) return
    if (JSON.stringify(oldRow[k]) !== JSON.stringify(newRow[k])) {
      d.audit_log.unshift({ ...base, record_id: newRow.id, action: 'UPDATE', field: k, old_value: String(oldRow[k] ?? ''), new_value: String(newRow[k] ?? ''), context: newRow[label] })
    }
  })
  d.audit_log = d.audit_log.slice(0, 1500)
}

class Query {
  constructor(table) { this.t = table; this.mode = 'select'; this.filters = []; this.sort = []; this.lim = null; this.ret = false; this.one = null }
  select() { this.ret = true; return this }
  insert(rows) { this.mode = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this }
  update(p) { this.mode = 'update'; this.payload = p; return this }
  upsert(rows, opt = {}) { this.mode = 'upsert'; this.payload = Array.isArray(rows) ? rows : [rows]; this.conflict = opt.onConflict || 'id'; return this }
  delete() { this.mode = 'delete'; return this }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this }
  in(c, arr) { this.filters.push((r) => arr.includes(r[c])); return this }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this }
  order(c, o = {}) { this.sort.push([c, o.ascending !== false]); return this }
  limit(n) { this.lim = n; return this }
  maybeSingle() { this.one = 'maybe'; return this }
  single() { this.one = 'single'; return this }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej) }

  run() {
    const d = data()
    const rows = (d[this.t] ??= [])
    const match = (r) => this.filters.every((f) => f(r))
    let out = null
    if (this.mode === 'insert' || this.mode === 'upsert') {
      out = []
      for (const p of this.payload) {
        const keys = this.mode === 'upsert' ? this.conflict.split(',') : null
        const found = keys && rows.find((r) => keys.every((k) => r[k] === p[k]))
        if (found) { const old = { ...found }; Object.assign(found, p); audit(d, this.t, 'UPDATE', old, found); out.push(found); continue }
        const dup = ['materials', 'suppliers', 'cut_templates', 'labor_steps'].includes(this.t) ? rows.find((r) => r.name?.toLowerCase() === String(p.name).toLowerCase()) : null
        if (dup) return { data: null, error: { message: `Ya existe “${p.name}”` } }
        const row = { id: uid(), created_at: now(), ...(DEFAULTS[this.t] ?? {}), ...p }
        rows.push(row); audit(d, this.t, 'INSERT', null, row); out.push(row)
      }
    } else if (this.mode === 'update') {
      out = rows.filter(match).map((r) => { const old = { ...r }; Object.assign(r, this.payload); audit(d, this.t, 'UPDATE', old, r); return r })
    } else if (this.mode === 'delete') {
      const hit = rows.filter(match)
      if (this.t === 'materials' && d.purchase_items?.some((i) => hit.some((m) => m.id === i.material_id))) {
        return { data: null, error: { message: 'No se puede eliminar: el insumo tiene compras registradas' } }
      }
      out = rows.filter(match); out.forEach((r) => audit(d, this.t, 'DELETE', r, null)); d[this.t] = rows.filter((r) => !match(r))
    } else {
      out = rows.filter(match).slice()
      for (const [c, asc] of [...this.sort].reverse()) out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1))
      if (this.lim) out = out.slice(0, this.lim)
    }
    if (this.mode !== 'select') save(d)
    if (this.mode !== 'select' && !this.ret) return { data: null, error: null }
    if (this.one) return { data: out[0] ?? null, error: this.one === 'single' && !out[0] ? { message: 'No encontrado' } : null }
    return { data: out, error: null }
  }
}

// ---------- RPC (misma lógica que las funciones SQL de la etapa 5) ----------
const rpcs = {
  register_purchase({ p_supplier, p_date, p_ref, p_notes, p_items, p_shipping }) {
    const d = data()
    if (!p_items?.length) return { error: { message: 'Agregá al menos un insumo' } }
    const ship = Math.max(Number(p_shipping) || 0, 0)
    let sum = 0
    for (const it of p_items) {
      const q = Number(it.qty) || 0, miss = Number(it.qty_missing) || 0
      if (q < 0 || miss < 0) return { error: { message: 'Las cantidades no pueden ser negativas' } }
      if (q === 0 && miss === 0) return { error: { message: 'Cada línea necesita cantidad recibida o faltante' } }
      if (!(Number(it.unit_price) >= 0)) return { error: { message: 'El precio no es válido' } }
      if (!d.materials.find((m) => m.id === it.material_id)) return { error: { message: 'Insumo no encontrado' } }
      sum += Math.round(q * Number(it.unit_price) * 100) / 100
    }
    const pid = uid(); let total = 0
    d.purchases ??= []; d.purchase_items ??= []; d.material_movements ??= []; d.supplier_prices ??= []
    for (const it of p_items) {
      const m = d.materials.find((x) => x.id === it.material_id)
      const qty = Number(it.qty) || 0; const price = Number(it.unit_price)
      const sub = Math.round(qty * price * 100) / 100
      const cost = price + (sum > 0 && qty > 0 ? (ship * sub / sum) / qty : 0)
      if (qty > 0) {
        const base = Math.max(m.stock, 0)
        m.avg_cost = Math.round(((base * m.avg_cost + qty * cost) / (base + qty)) * 1e4) / 1e4
        m.last_cost = Math.round(cost * 1e4) / 1e4; m.stock = Math.round((m.stock + qty) * 1e3) / 1e3
        if (it.width_cm) m.width_cm = Number(it.width_cm)
        d.material_movements.unshift({ id: uid(), material_id: m.id, kind: 'compra', qty, unit_cost: Math.round(cost * 1e4) / 1e4, ref_id: pid, note: p_ref || '', created_by: actor(), created_at: now() })
      }
      d.purchase_items.push({ id: uid(), purchase_id: pid, material_id: m.id, qty, qty_missing: Number(it.qty_missing) || 0, unit_price: price, unit_cost: Math.round(cost * 1e4) / 1e4, width_cm: it.width_cm || null, size_note: it.size_note || '', subtotal: sub }); total += sub
      if (p_supplier && qty > 0) {
        const last = d.supplier_prices.filter((p) => p.material_id === m.id && p.supplier_id === p_supplier).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
        if (!last || last.price !== price) d.supplier_prices.push({ id: uid(), material_id: m.id, supplier_id: p_supplier, price, source: 'compra', note: 'Compra ' + (p_ref || pid.slice(0, 8)), created_at: now() })
      }
    }
    d.purchases.unshift({ id: pid, supplier_id: p_supplier || null, purchase_date: p_date || now().slice(0, 10), invoice_ref: p_ref || '', notes: p_notes || '', shipping: ship, total: total + ship, created_at: now() })
    save(d); return { data: pid, error: null }
  },
  adjust_material_stock({ p_material, p_delta, p_kind, p_note }) {
    const d = data(); const m = d.materials.find((x) => x.id === p_material)
    if (!m) return { error: { message: 'Insumo no encontrado' } }
    if (!p_delta) return { error: { message: 'Ingresá una cantidad distinta de 0' } }
    m.stock = Math.round((m.stock + p_delta) * 1e3) / 1e3
    ;(d.material_movements ??= []).unshift({ id: uid(), material_id: m.id, kind: p_kind, qty: p_delta, unit_cost: m.avg_cost, note: p_note || '', created_by: actor(), created_at: now() })
    save(d); return { data: m.stock, error: null }
  },
  log_visit({ p_session, p_path, p_ref, p_device }) {
    const d = data(); d.page_views ??= []
    const recent = d.page_views.find((v) => v.session_id === p_session && v.path === p_path && Date.now() - new Date(v.created_at) < 30000)
    if (!recent) { d.page_views.unshift({ id: uid(), session_id: p_session, path: p_path, referrer: p_ref || null, device: p_device, created_at: now() }); d.page_views = d.page_views.slice(0, 3000); save(d) }
    return { data: null, error: null }
  }
}

export const demoDb = {
  from: (t) => new Query(t),
  rpc: (name, args) => Promise.resolve(rpcs[name] ? rpcs[name](args) : { data: null, error: { message: 'rpc no disponible en demo: ' + name } }),
  _reset: () => localStorage.removeItem(KEY)
}
