// Promociones: el precio que se COBRA siempre es `price`. Si hay promo, `listPrice` guarda el precio normal (tachado en la tienda).
export const todayAR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10) // Argentina = UTC-3 sin horario de verano

export const onPromo = (v) =>
  v?.listPrice != null && v.listPrice !== '' && Number(v.listPrice) > Number(v.price) && (!v.promoEnds || String(v.promoEnds).slice(0, 10) >= todayAR())
export const pctOff = (v) => (onPromo(v) ? Math.round((1 - Number(v.price) / Number(v.listPrice)) * 100) : 0)
export const hasPromo = (p) => (p.variants ?? []).some((v) => v.active && onPromo(v))
// etiqueta que eligió la dueña para la promo de mayor descuento ("Oferta", "Promoción", "Liquidación"…)
export const promoLabelOf = (p) => {
  const best = (p.variants ?? []).filter((v) => v.active && onPromo(v)).sort((a, b) => pctOff(b) - pctOff(a))[0]
  return best?.promoLabel?.trim() || 'Oferta'
}
export const bestPct = (p) => Math.max(0, ...(p.variants ?? []).filter((v) => v.active).map(pctOff))

// Variante de la base -> variante del formulario (precio normal + datos de promo)
export const toFormVariant = (v) => {
  const promo = onPromo(v)
  return {
    ...v,
    price: promo ? Number(v.listPrice) : Number(v.price),
    promoOn: promo, promoPrice: promo ? Number(v.price) : '', promoEnds: promo ? (v.promoEnds ?? '') : '', promoLabel: promo ? (v.promoLabel ?? '') : ''
  }
}
// Variante del formulario -> variante a guardar (price = lo que se cobra)
export const fromFormVariant = (v) => {
  const regular = Number(v.price) || 0
  const promo = v.promoOn && Number(v.promoPrice) > 0 && Number(v.promoPrice) < regular
  return {
    id: v.id, label: v.label, weight_kg: v.weight_kg, stock: v.stock, active: v.active,
    price: promo ? Number(v.promoPrice) : regular,
    listPrice: promo ? regular : null,
    promoLabel: promo ? (v.promoLabel ?? '') : '',
    promoEnds: promo && v.promoEnds ? v.promoEnds : ''
  }
}
