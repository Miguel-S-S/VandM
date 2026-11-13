import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useSettings } from '../lib/settings'
import { requestPhoneCode, confirmPhoneCode } from '../lib/data'
import { normalizePhone } from '../lib/phone'

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/')
const RESULTS = {
  bad: 'Código incorrecto. Revisalo e intentá de nuevo.',
  locked: 'Demasiados intentos. Pedí un código nuevo.',
  expired: 'El código venció. Pedí uno nuevo.',
  none: 'No hay un código vigente. Pedí uno nuevo.'
}

export default function Verificar() {
  const { user, isVerified, loading, refreshProfile } = useAuth()
  const { settings } = useSettings()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [requested, setRequested] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <p className="muted center">Cargando…</p>
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent('/verificar?next=' + next)}`} replace />

  if (isVerified) {
    return (
      <div className="panel narrow-box center">
        <div style={{ fontSize: '3rem' }}>✅</div>
        <h2>Número verificado</h2>
        <p className="muted">Ya podés hacer pedidos.</p>
        <Link to={next === '/' ? '/carrito' : next} className="btn">Continuar</Link>
      </div>
    )
  }

  const pretty = user.phone ? normalizePhone(user.phone).pretty ?? user.phone : ''
  const ask = async () => {
    setBusy(true); setMsg('')
    try { await requestPhoneCode(); setRequested(true) } catch (e) { setMsg(e.message) }
    setBusy(false)
  }
  const confirm = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setMsg('El código tiene 6 números')
    setBusy(true); setMsg('')
    try {
      const r = await confirmPhoneCode(code)
      if (r === 'ok') await refreshProfile()
      else setMsg(RESULTS[r] ?? 'No se pudo verificar')
    } catch (e2) { setMsg(e2.message) }
    setBusy(false)
  }
  const waOwner = settings.whatsapp
    ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(`Hola! Soy ${user.name}. Pedí el código de verificación para mi número ${pretty}.`)}`
    : null

  return (
    <div className="panel narrow-box">
      <h2>Verificá tu número</h2>
      <p className="muted">Para comprar, confirmamos que el teléfono <b>{pretty}</b> es tuyo. La dueña te envía un código por WhatsApp.</p>

      <h4>1. Pedí tu código</h4>
      <button className="btn" onClick={ask} disabled={busy}>{requested ? 'Pedir otro código' : 'Pedir código'}</button>
      {requested && (
        <p className="small">Listo, avisamos a la dueña. Te va a escribir por WhatsApp al {pretty}.
          {waOwner && <> Para que lo vea más rápido, <a href={waOwner} target="_blank" rel="noreferrer">avisale por WhatsApp</a>.</>}</p>
      )}

      <h4>2. Ingresá el código</h4>
      <form className="row" onSubmit={confirm}>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
          autoComplete="one-time-code" placeholder="123456" maxLength={6} style={{ width: 140, letterSpacing: '.3em', textAlign: 'center', fontSize: '1.2rem' }} />
        <button className="btn" disabled={busy || code.length !== 6}>Verificar</button>
      </form>
      {msg && <p className="alert">{msg}</p>}
      <p className="muted small">El código vale 2 días y permite 5 intentos.</p>
    </div>
  )
}
