// Validación y normalización de teléfonos (Argentina por defecto; internacional con "+")
// Resultado: { ok, value, pretty, error }. value = solo dígitos, listo para wa.me (ej: 5493794265979)
export function normalizePhone(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return { ok: false, error: 'Ingresá tu teléfono' }
  if (!/^[+\d\s().-]+$/.test(raw)) return { ok: false, error: 'El teléfono solo puede tener números' }
  let d = raw.replace(/\D/g, '')

  if (raw.startsWith('+') && !d.startsWith('54')) {
    if (d.length < 8 || d.length > 15) return { ok: false, error: 'El número internacional no es válido' }
    return { ok: true, value: d, pretty: '+' + d }
  }
  if (d.startsWith('54')) { d = d.slice(2); if (d.startsWith('9')) d = d.slice(1) }
  d = d.replace(/^0+/, '')
  // quita el "15" de los celulares escritos en formato local (379 15 4265979)
  if (d.length === 12) {
    for (const a of [2, 3, 4]) if (d.slice(a, a + 2) === '15') { d = d.slice(0, a) + d.slice(a + 2); break }
  }
  if (d.length !== 10) {
    return { ok: false, error: 'Ingresá el número con código de área, sin 0 ni 15 (ej: 3794 265979)' }
  }
  return { ok: true, value: '549' + d, pretty: `+54 9 ${d}` }
}

// Mientras escribe: deja solo caracteres permitidos
export const cleanPhoneInput = (v) => v.replace(/[^\d+\s().-]/g, '')

// Las cuentas de clientes usan un email técnico derivado del teléfono (no se envían correos).
// Se puede cambiar el dominio con VITE_PHONE_EMAIL_DOMAIN.
const DOMAIN = import.meta.env.VITE_PHONE_EMAIL_DOMAIN || 'gmail.com'
export const phoneToEmail = (value) => `${value}@${DOMAIN}`
