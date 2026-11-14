// Etapas de fábrica del pedido. Las etapas vigentes se editan desde Panel → Estados (ver lib/statuses.jsx).
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

// Número para wa.me: normalizado si es válido, si no solo dígitos
import { normalizePhone } from './phone'
export function waNumber(phone) {
  const n = normalizePhone(phone)
  return n.ok ? n.value : String(phone).replace(/\D/g, '')
}
