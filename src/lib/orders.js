// Etapas del pedido (la dueña confecciona: cose y carga la arena)
export const STATUSES = [
  { key: 'recibido', label: 'Recibido', color: '#a3a3a3' },
  { key: 'confirmado', label: 'Confirmado', color: '#3b82f6' },
  { key: 'cosiendo', label: 'Cosiendo', color: '#D97757' },
  { key: 'cargando_arena', label: 'Cargando arena', color: '#eab308' },
  { key: 'listo', label: 'Listo para entregar', color: '#22c55e' },
  { key: 'entregado', label: 'Entregado', color: '#16a34a' },
  { key: 'cancelado', label: 'Cancelado', color: '#E02424' }
]
export const statusOf = (k) => STATUSES.find((s) => s.key === k) ?? STATUSES[0]
export const ACTIVE_STATUSES = ['recibido', 'confirmado', 'cosiendo', 'cargando_arena', 'listo']
export const fmtDay = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

// Número para wa.me: solo dígitos; si parece número argentino local sin código, agrega 549
export function waNumber(phone) {
  let d = String(phone).replace(/\D/g, '').replace(/^0+/, '')
  if (d.startsWith('54')) return d
  if (d.length >= 10 && d.length <= 11) { d = d.replace(/^(\d{2,4})15/, '$1'); return '549' + d }
  return d
}
