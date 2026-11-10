// Capa de datos: usa Supabase si hay variables de entorno, si no, localStorage (modo demo)
import { supabase, hasSupabase } from './supabase'
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEFAULT_SETTINGS } from './demoData'
import { uid } from './format'

const LS = { products: 'vm_products', settings: 'vm_settings', audit: 'vm_audit' }
const read = (k, fb) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb } catch { return fb }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const byWeight = (a, b) => (a.weight_kg ?? 0) - (b.weight_kg ?? 0)

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------- Categorías ---------------- */
export async function listCategories() {
  if (!hasSupabase) return DEMO_CATEGORIES
  const { data, error } = await supabase.from('categories').select('id, slug, name').order('position')
  if (error) throw error
  return data
}

/* ---------------- Productos ---------------- */
const normalize = (row) => ({
  id: row.id,
  category: row.category?.slug ?? null,
  categoryName: row.category?.name ?? null,
  name: row.name,
  description: row.description ?? '',
  images: row.images ?? [],
  active: row.active,
  featured: row.featured,
  variants: (row.variants ?? []).slice().sort(byWeight)
})

export async function listProducts() {
  if (!hasSupabase) {
    let p = read(LS.products, null)
    if (!p) { p = DEMO_PRODUCTS(); write(LS.products, p) }
    return p
  }
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
    active: v.active !== false
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
    images: prod.images, active: prod.active, featured: prod.featured
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
    const { error } = await supabase.from('product_variants').upsert(variants.map((v) => ({ ...v, product_id: id })))
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
function shrinkImage(file, max = 1100, quality = 0.82) {
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
