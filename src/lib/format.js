const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const fmtMoney = (n) => money.format(Number(n) || 0)
export const fmtDate = (d) =>
  new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
export const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) || 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2)
