import { useEffect, useState } from 'react'
import { listPhoneRequests, markCodeSent, discardCode, verifyUserManually } from '../lib/data'
import { useSettings } from '../lib/settings'
import { normalizePhone } from '../lib/phone'
import { fmtDate } from '../lib/format'
import { waNumber } from '../lib/orders'

export default function AdminVerificaciones() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const { settings } = useSettings()
  const load = () => listPhoneRequests().then(setRows).catch((e) => setError(e.message))
  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const run = async (fn) => { setError(''); try { await fn(); await load() } catch (e) { setError(e.message) } }
  const msg = (r) =>
    `Hola ${(r.profile?.full_name ?? '').split(' ')[0]}! Tu código de verificación de ${settings.storeName} es: ${r.code}. Ingresalo en la app para poder comprar.`

  return (
    <>
      <h2>Verificación de clientes</h2>
      <p className="muted small">
        Cuando un cliente se registra y pide su código, aparece acá. Tocá “Enviar por WhatsApp” para mandarle el código a su número;
        él lo ingresa en la app y queda habilitado para comprar. La lista se actualiza sola cada 30 segundos.
      </p>
      {error && <p className="alert">{error}</p>}
      {rows?.length === 0 && <p className="muted">No hay códigos pendientes.</p>}
      <div className="item-list">
        {rows?.map((r) => (
          <div key={r.id} className="item" style={{ gridTemplateColumns: '1fr auto' }}>
            <div>
              <b>{r.profile?.full_name ?? 'Cliente'}</b>
              <span className="muted small">{normalizePhone(r.phone).pretty ?? r.phone} · pedido {fmtDate(r.created_at)}{r.sent && ' · ✔ enviado'}</span>
              <span className="code">{r.code}</span>
            </div>
            <div className="actions" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
              <a className="btn wa" style={{ width: 'auto' }} target="_blank" rel="noreferrer"
                href={`https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(msg(r))}`}
                onClick={() => !r.sent && markCodeSent(r.id).then(load)}>
                Enviar por WhatsApp
              </a>
              <button className="link" onClick={() => confirm('¿Verificar a este cliente sin código? (por ejemplo, si ya lo conocés)') && run(() => verifyUserManually(r.user_id, r.id))}>Verificar manualmente</button>
              <button className="link danger" onClick={() => run(() => discardCode(r.id))}>Descartar</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
