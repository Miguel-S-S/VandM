import { useEffect } from 'react'
import { logVisit } from './insumos'

// Registro silencioso de visitas: sin IP ni datos personales (sesión anónima, ruta, origen y tipo de dispositivo)
function session() {
  try {
    const now = Date.now()
    const last = Number(localStorage.getItem('vm_sid_t') || 0)
    let sid = localStorage.getItem('vm_sid')
    let fresh = false
    if (!sid || now - last > 30 * 60 * 1000) {
      sid = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + now).replace(/-/g, '').slice(0, 24)
      localStorage.setItem('vm_sid', sid); fresh = true
    }
    localStorage.setItem('vm_sid_t', String(now))
    return { sid, fresh }
  } catch { return null }
}

const device = () => (window.innerWidth < 700 ? 'movil' : window.innerWidth < 1100 ? 'tablet' : 'escritorio')

export function useVisits(pathname, isStaff) {
  useEffect(() => {
    if (isStaff || pathname.startsWith('/admin')) return
    const s = session()
    if (!s) return
    let ref = ''
    if (s.fresh && document.referrer) {
      try { const u = new URL(document.referrer); if (u.origin !== location.origin) ref = u.hostname } catch { /* ignorar */ }
    }
    logVisit({ p_session: s.sid, p_path: pathname, p_ref: ref, p_device: device() })
  }, [pathname, isStaff])
}
