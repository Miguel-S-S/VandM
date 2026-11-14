// Capa de datos: usa Supabase si hay variables de entorno, si no, localStorage (modo demo)
import { supabase, hasSupabase } from './supabase'
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEFAULT_SETTINGS, ACTIVITIES, NEWS } from './demoData'
import { uid } from './format'
import { addDays } from './orders'

const LS = { products: 'vm_products', settings: 'vm_settings', audit: 'vm_audit', cats: 'vm_categories', orders: 'vm_orders', news: 'vm_news', acts: 'vm_activities' }
const read = (k, fb) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb } catch { return fb }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const byWeight = (a, b) => (a.weight_kg ?? 0) - (b.weight_kg ?? 0)

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------- Categorías ---------------- */
export async function listCategories() {
  if (!hasSupabase) {
    let c = read(LS.cats, null)
    if (!c) { c = DEMO_CATEGORIES.map((x) => ({ ...x, id: x.slug })); write(LS.cats, c) }
    return c
  }
  const { data, error } = await supabase.from('categories').select('id, slug, name').order('position')
  if (error) throw error
  return data
}

export const slugify = (t) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export async function saveCategory(c) {
  const slug = c.slug || slugify(c.name)
  if (!slug) throw new Error('Ingresá un nombre')
  if (!hasSupabase) {
    const list = await listCategories()
    const id = c.id || slug
    write(LS.cats, list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? { ...x, name: c.name } : x)) : [...list, { id, slug, name: c.name }])
    return
  }
  const row = { name: c.name, slug }
  if (c.id) row.id = c.id
  else row.position = 100
  const { error } = await supabase.from('categories').upsert(row)
  if (error) throw error
}

export async function deleteCategory(c) {
  if (!hasSupabase) { write(LS.cats, (await listCategories()).filter((x) => x.id !== c.id)); return }
  const { error } = await supabase.from('categories').delete().eq('id', c.id)
  if (error) throw error
}

/* ---------------- Productos ---------------- */
const normVariant = (v) => ({
  ...v,
  price: Number(v.price),
  listPrice: v.list_price != null ? Number(v.list_price) : (v.listPrice ?? null),
  promoLabel: v.promo_label ?? v.promoLabel ?? '',
  promoEnds: v.promo_ends ?? v.promoEnds ?? ''
})
const normalize = (row) => ({
  id: row.id,
  category: row.category?.slug ?? null,
  categoryName: row.category?.name ?? null,
  name: row.name,
  description: row.description ?? '',
  images: row.images ?? [],
  active: row.active,
  featured: row.featured,
  isCombo: Boolean(row.is_combo),
  comboItems: row.combo_items ?? [],
  variants: (row.variants ?? []).map(normVariant).sort(byWeight)
})

// Cierra las promociones vencidas (el precio vuelve al normal). Se hace como máximo cada 5 minutos.
let lastSweep = 0
async function sweepPromos() {
  if (!hasSupabase || Date.now() - lastSweep < 300000) return
  lastSweep = Date.now()
  await supabase.rpc('end_expired_promos') // si la función todavía no existe, no pasa nada
}

export async function listProducts() {
  if (!hasSupabase) {
    let p = read(LS.products, null)
    if (!p) { p = DEMO_PRODUCTS(); write(LS.products, p) }
    return p
  }
  await sweepPromos()
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(slug,name), variants:product_variants(*)')
    .order('created_at')
  if (error) throw error
  return data.map(normalize)
}

export async function getProduct(id) {
  const all = await listProducts()
  return all.find((p) => p.id === id) ?? null
}

export async function saveProduct(prod) {
  const id = prod.id || uid()
  const variants = prod.variants.map((v) => ({
    id: v.id || uid(),
    label: v.label || `${v.weight_kg} kg`,
    weight_kg: v.weight_kg === '' ? null : Number(v.weight_kg),
    price: Number(v.price) || 0,
    stock: parseInt(v.stock, 10) || 0,
    active: v.active !== false,
    // promoción: `price` es lo que se cobra y `listPrice` el precio normal (tachado)
    listPrice: v.listPrice != null && v.listPrice !== '' ? Number(v.listPrice) : null,
    promoLabel: v.promoLabel ?? '',
    promoEnds: v.promoEnds || ''
  }))

  if (!hasSupabase) {
    const list = read(LS.products, DEMO_PRODUCTS())
    const prev = list.find((p) => p.id === id)
    // auditoría local de precio / stock
    const log = read(LS.audit, [])
    const push = (field, o, n, v) =>
      log.unshift({ id: uid(), changed_at: new Date().toISOString(), table_name: 'product_variants',
        action: 'UPDATE', field, old_value: String(o), new_value: String(n), context: `${prod.name} · ${v.label}` })
    variants.forEach((v) => {
      const old = prev?.variants.find((x) => x.id === v.id)
      if (!old) log.unshift({ id: uid(), changed_at: new Date().toISOString(), table_name: 'product_variants',
        action: 'INSERT', field: 'price', old_value: null, new_value: String(v.price), context: `${prod.name} · ${v.label}` })
      else {
        if (old.price !== v.price) push('price', old.price, v.price, v)
        if (old.stock !== v.stock) push('stock', old.stock, v.stock, v)
      }
    })
    write(LS.audit, log.slice(0, 500))
    const clean = { ...prod, id, variants: variants.sort(byWeight) }
    write(LS.products, prev ? list.map((p) => (p.id === id ? clean : p)) : [...list, clean])
    return id
  }

  const cats = await listCategories()
  const category_id = cats.find((c) => c.slug === prod.category)?.id ?? null
  const { error: e1 } = await supabase.from('products').upsert({
    id, category_id, name: prod.name, description: prod.description,
    images: prod.images, active: prod.active, featured: prod.featured,
    is_combo: Boolean(prod.isCombo), combo_items: prod.isCombo ? (prod.comboItems ?? []) : []
  })
  if (e1) throw e1

  const { data: existing, error: e2 } = await supabase.from('product_variants').select('id').eq('product_id', id)
  if (e2) throw e2
  const keep = new Set(variants.map((v) => v.id))
  const toDelete = existing.map((v) => v.id).filter((vid) => !keep.has(vid))
  if (toDelete.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', toDelete)
    if (error) throw error
  }
  if (variants.length) {
    const rows = variants.map((v) => ({
      id: v.id, product_id: id, label: v.label, weight_kg: v.weight_kg, price: v.price, stock: v.stock, active: v.active,
      list_price: v.listPrice, promo_label: v.promoLabel, promo_ends: v.promoEnds || null
    }))
    const { error } = await supabase.from('product_variants').upsert(rows)
    if (error) throw error
  }
  return id
}

export async function deleteProduct(id) {
  if (!hasSupabase) {
    write(LS.products, read(LS.products, []).filter((p) => p.id !== id))
    return
  }
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Fotos ---------------- */
// Reduce la imagen (máx. 1100px, JPEG) antes de subirla para ahorrar datos y espacio
function shrinkImage(file, max = 900, quality = 0.76) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('Imagen inválida'))
    img.src = url
  })
}

export async function uploadImage(file) {
  const blob = await shrinkImage(file)
  if (!hasSupabase) {
    return new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  }
  const path = `${uid()}.jpg`
  const { error } = await supabase.storage.from('product-images').upload(path, blob, {
    contentType: 'image/jpeg', cacheControl: '31536000'
  })
  if (error) throw error
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

/* ---------------- Ajustes del sitio ---------------- */
const mergeSettings = (s) => ({
  ...DEFAULT_SETTINGS, ...s,
  social: { ...DEFAULT_SETTINGS.social, ...(s?.social ?? {}) },
  theme: { ...DEFAULT_SETTINGS.theme, ...(s?.theme ?? {}) }
})

export async function getSettings() {
  if (!hasSupabase) return mergeSettings(read(LS.settings, {}))
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'main').maybeSingle()
  if (error) throw error
  return mergeSettings(data?.value ?? {})
}

export async function saveSettings(s) {
  if (!hasSupabase) { write(LS.settings, s); return }
  const { error } = await supabase.from('site_settings').upsert({ key: 'main', value: s, updated_at: new Date().toISOString() })
  if (error) throw error
}

/* ---------------- Auditoría ---------------- */
export async function listAudit() {
  if (!hasSupabase) return read(LS.audit, [])
  const { data, error } = await supabase.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(300)
  if (error) throw error
  return data
}

export const resetDemo = () => Object.values(LS).forEach((k) => localStorage.removeItem(k))


/* ---------------- Actividades ---------------- */
const mapActivity = (r) => ({
  id: r.id, title: r.title, description: r.description ?? '', category: r.category?.slug ?? null,
  categoryName: r.category?.name ?? null, productId: r.product_id ?? null, productName: r.product?.name ?? null,
  level: r.level, minutes: r.minutes ?? '', recommend: r.recommend ?? '', image: r.image_url ?? '',
  published: r.published, position: r.position ?? 0
})

export async function listActivities() {
  if (!hasSupabase) {
    let a = read(LS.acts, null)
    if (!a) {
      a = ACTIVITIES.map((x, i) => ({ id: uid(), title: x.title, description: x.desc, category: x.category, productId: null,
        level: x.level, minutes: x.minutes, recommend: x.recommend, image: '', published: true, position: i + 1 }))
      write(LS.acts, a)
    }
    return a
  }
  const { data, error } = await supabase.from('activities')
    .select('*, category:categories(slug,name), product:products(name)').order('position').order('created_at')
  if (error) throw error
  return data.map(mapActivity)
}

export async function saveActivity(a) {
  const id = a.id || uid()
  if (!hasSupabase) {
    const list = read(LS.acts, []) 
    const clean = { ...a, id, minutes: a.minutes === '' ? '' : Number(a.minutes) }
    write(LS.acts, list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? clean : x)) : [...list, clean])
    return
  }
  const cats = await listCategories()
  const { error } = await supabase.from('activities').upsert({
    id, title: a.title, description: a.description, category_id: cats.find((c) => c.slug === a.category)?.id ?? null,
    product_id: a.productId || null, level: a.level, minutes: a.minutes === '' ? null : Number(a.minutes),
    recommend: a.recommend, image_url: a.image || null, published: a.published, position: Number(a.position) || 0
  })
  if (error) throw error
}

export async function deleteActivity(id) {
  if (!hasSupabase) { write(LS.acts, read(LS.acts, []).filter((x) => x.id !== id)); return }
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- Noticias y eventos ---------------- */
const mapNews = (r) => ({
  id: r.id, title: r.title, body: r.body ?? '', tag: r.tag, date: r.event_date ?? '', image: r.image_url ?? '', published: r.published,
  createdAt: r.created_at
})

export async function listNews() {
  if (!hasSupabase) {
    let n = read(LS.news, null)
    if (!n) {
      n = NEWS.map((x) => ({ id: uid(), title: x.title, body: x.body, tag: x.tag, date: x.date, image: '', published: true }))
      write(LS.news, n)
    }
    return n
  }
  const { data, error } = await supabase.from('news').select('*')
    .order('event_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapNews)
}

export async function saveNews(n) {
  const id = n.id || uid()
  if (!hasSupabase) {
    const list = read(LS.news, [])
    const clean = { ...n, id }
    write(LS.news, list.some((x) => x.id === id) ? list.map((x) => (x.id === id ? clean : x)) : [clean, ...list])
    return
  }
  const { error } = await supabase.from('news').upsert({
    id, title: n.title, body: n.body, tag: n.tag, event_date: n.date || null, image_url: n.image || null, published: n.published
  })
  if (error) throw error
}

export async function deleteNews(id) {
  if (!hasSupabase) { write(LS.news, read(LS.news, []).filter((x) => x.id !== id)); return }
  const { error } = await supabase.from('news').delete().eq('id', id)
  if (error) throw error
}


/* ---------------- Pedidos ---------------- */
const mapOrder = (r) => ({
  id: r.id, number: r.number, customerName: r.customer_name, phone: r.customer_phone, notes: r.notes ?? '',
  status: r.status, total: Number(r.total), estimated: r.estimated_delivery ?? '', staffNotes: r.staff_notes ?? '',
  createdAt: r.created_at, customerId: r.customer_id,
  items: (r.items ?? []).map((i) => ({ id: i.id, name: i.product_name, label: i.label, price: Number(i.price), qty: i.qty })),
  log: (r.log ?? []).map((l) => ({ status: l.status, at: l.changed_at })).sort((a, b) => new Date(a.at) - new Date(b.at))
})

export async function createOrder({ name, phone, notes, items }) {
  if (!hasSupabase) {
    const products = read(LS.products, DEMO_PRODUCTS())
    const orders = read(LS.orders, [])
    const lines = []
    for (const it of items) {
      const prod = products.find((p) => p.variants.some((v) => v.id === it.variantId))
      const v = prod?.variants.find((x) => x.id === it.variantId)
      if (!v || !v.active) throw new Error('Un producto del carrito ya no está disponible')
      if (v.stock < it.qty) throw new Error(`Sin stock suficiente de ${prod.name} ${v.label}`)
      lines.push({ prod, v, qty: it.qty })
    }
    lines.forEach(({ v, qty }) => { v.stock -= qty })
    write(LS.products, products)
    const settings = read(LS.settings, {})
    const order = {
      id: uid(), number: (orders.reduce((m, o) => Math.max(m, o.number), 1000)) + 1, customerName: name, phone, notes,
      status: 'recibido', total: lines.reduce((n, l) => n + l.v.price * l.qty, 0), estimated: addDays(settings.deliveryDays ?? 7),
      staffNotes: '', createdAt: new Date().toISOString(), customerId: null,
      items: lines.map((l) => ({ id: uid(), name: l.prod.name, label: l.v.label, price: l.v.price, qty: l.qty })),
      log: [{ status: 'recibido', at: new Date().toISOString() }]
    }
    write(LS.orders, [order, ...orders])
    return order
  }
  // el servidor toma nombre y teléfono del perfil verificado (no se pueden falsificar desde el cliente)
  const { data, error } = await supabase.rpc('create_order', {
    p_notes: notes || '',
    p_items: items.map((i) => ({ variant_id: i.variantId, qty: i.qty }))
  })
  if (error) throw new Error(error.message)
  const r = Array.isArray(data) ? data[0] : data
  return {
    id: r.o_id, number: r.o_number, customerName: name, phone, notes, status: 'recibido', total: Number(r.o_total),
    estimated: r.o_estimated, items: items.map((i) => ({ name: i.name, label: i.label, price: i.price, qty: i.qty })), log: []
  }
}

// staff: todos; cliente: solo los suyos (lo filtra la base con RLS)
export async function listOrders() {
  if (!hasSupabase) return read(LS.orders, [])
  const { data, error } = await supabase.from('orders')
    .select('*, items:order_items(*), log:order_status_log(status, changed_at)')
    .order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return data.map(mapOrder)
}

export async function updateOrder(id, patch) {
  if (!hasSupabase) {
    const orders = read(LS.orders, [])
    const o = orders.find((x) => x.id === id)
    if (!o) return
    if (patch.status && patch.status !== o.status) {
      const products = read(LS.products, [])
      const sign = patch.status === 'cancelado' && o.status !== 'cancelado' ? 1 : o.status === 'cancelado' && patch.status !== 'cancelado' ? -1 : 0
      if (sign) {
        o.items.forEach((it) => products.forEach((p) => p.variants.forEach((v) => {
          if (p.name === it.name && v.label === it.label) v.stock = Math.max(0, v.stock + sign * it.qty)
        })))
        write(LS.products, products)
      }
      o.log = [...(o.log ?? []), { status: patch.status, at: new Date().toISOString() }]
    }
    Object.assign(o, patch)
    write(LS.orders, orders)
    return
  }
  const row = {}
  if (patch.status) row.status = patch.status
  if ('estimated' in patch) row.estimated_delivery = patch.estimated || null
  if ('staffNotes' in patch) row.staff_notes = patch.staffNotes
  const { error } = await supabase.from('orders').update(row).eq('id', id)
  if (error) throw error
}


/* ---------------- Verificación de teléfono ---------------- */
export async function requestPhoneCode() {
  if (!hasSupabase) return 'verified'
  const { data, error } = await supabase.rpc('request_phone_code')
  if (error) throw new Error(error.message)
  return data
}

// devuelve: ok | bad | locked | expired | none
export async function confirmPhoneCode(code) {
  if (!hasSupabase) return 'ok'
  const { data, error } = await supabase.rpc('confirm_phone_code', { p_code: code })
  if (error) throw new Error(error.message)
  return data
}

// staff: pedidos de código pendientes
export async function listPhoneRequests() {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('phone_codes')
    .select('id, code, phone, sent, created_at, expires_at, user_id, profile:profiles(full_name, phone_verified)')
    .eq('used', false).order('created_at', { ascending: false })
  if (error) throw error
  return data.filter((r) => new Date(r.expires_at) > new Date())
}
export async function markCodeSent(id) {
  const { error } = await supabase.from('phone_codes').update({ sent: true }).eq('id', id)
  if (error) throw error
}
export async function discardCode(id) {
  const { error } = await supabase.from('phone_codes').update({ used: true }).eq('id', id)
  if (error) throw error
}
export async function verifyUserManually(userId, codeId) {
  const { error } = await supabase.from('profiles').update({ phone_verified: true }).eq('id', userId)
  if (error) throw error
  if (codeId) await discardCode(codeId)
}
