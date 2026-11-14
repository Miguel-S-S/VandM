// Cálculo del largo de tela necesario para un conjunto de piezas rectangulares.
// Acomoda las piezas en "filas" a lo ancho del rollo (puede girarlas 90°) y suma el alto de cada fila.
// Es una estimación práctica para presupuestar y comprar; el corte real puede aprovechar algo mejor.
export function planCut({ rollWidth, margin = 0, pieces }) {
  const W = Number(rollWidth)
  if (!(W > 0)) return { error: 'Ingresá el ancho del rollo' }
  const m = Math.max(Number(margin) || 0, 0) * 2
  const items = []
  for (const p of pieces) {
    const n = Math.floor(Number(p.n) || 0)
    const w = Number(p.w), h = Number(p.h)
    if (!n) continue
    if (!(w > 0) || !(h > 0)) return { error: `Medidas inválidas en “${p.label || 'pieza'}”` }
    let a = w + m, b = h + m
    // se elige la orientación que entra en el ancho del rollo y gasta menos largo
    const opts = [[a, b], [b, a]].filter(([x]) => x <= W).sort((x, y) => x[1] - y[1])
    if (!opts.length) return { error: `“${p.label || 'pieza'}” (${a}×${b} cm) no entra en un rollo de ${W} cm de ancho` }
    for (let i = 0; i < n; i++) items.push({ w: opts[0][0], h: opts[0][1] })
  }
  if (!items.length) return { error: 'Agregá al menos una pieza' }
  items.sort((x, y) => y.h - x.h)
  const rows = []
  for (const it of items) {
    const row = rows.find((r) => r.used + it.w <= W + 1e-9 && it.h <= r.h)
    if (row) row.used += it.w
    else rows.push({ h: it.h, used: it.w })
  }
  const length = rows.reduce((n, r) => n + r.h, 0)
  const pieceArea = items.reduce((n, i) => n + i.w * i.h, 0)
  const waste = 1 - pieceArea / (W * length)
  return { lengthCm: Math.round(length * 100) / 100, rows: rows.length, pieces: items.length, scrapPct: Math.round(waste * 1000) / 10 }
}

// metros a comprar = largo + merma extra (recortes que no se pueden aprovechar)
export const metersWithWaste = (lengthCm, wastePct = 0) => (lengthCm / 100) * (1 + (Number(wastePct) || 0) / 100)

// tiempo y costo de mano de obra para un peso dado
export function laborFor(steps, weightKg, hourCost) {
  const minutes = steps.filter((s) => s.active !== false).reduce((n, s) => n + Number(s.minutes_base) + Number(s.minutes_per_kg) * weightKg, 0)
  return { minutes, cost: (minutes / 60) * (Number(hourCost) || 0) }
}
