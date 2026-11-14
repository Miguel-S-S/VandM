// Relación producto ↔ actividades.
// Una actividad se muestra para un producto si está vinculada a ESE producto, o si no tiene producto y es de su misma categoría.
export const productIdsOf = (p) => (p.isCombo ? [...new Set((p.comboItems ?? []).map((i) => i.productId))] : [p.id])

export function relatedActivities(acts, p, products = null) {
  const ids = productIdsOf(p)
  const cats = new Set([p.category, ...(products ? products.filter((x) => ids.includes(x.id)).map((x) => x.category) : [])].filter(Boolean))
  const specific = acts.filter((a) => a.productId && ids.includes(a.productId))
  const general = p.isCombo ? [] : acts.filter((a) => !a.productId && a.category && cats.has(a.category))
  return [...specific, ...general]
}

// enlace a la página de actividades filtrada por el artículo (y, opcionalmente, resaltando una actividad)
export const activitiesLink = (p, actId) => {
  const q = new URLSearchParams({ producto: productIdsOf(p).join(',') })
  if (actId) q.set('act', actId)
  return `/actividades?${q}`
}
