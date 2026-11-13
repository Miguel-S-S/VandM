import { useState } from 'react'
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { normalizePhone, cleanPhoneInput } from '../lib/phone'

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/')

export default function Login() {
  const { signIn, signUp, demo, user, loading } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [mode, setMode] = useState('in')
  const [f, setF] = useState({ id: '', phone: '', password: '', password2: '', name: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, clean) => (e) => setF({ ...f, [k]: clean ? clean(e.target.value) : e.target.value })

  if (demo) return <p className="center">En modo demo no hace falta iniciar sesión: usá el selector “Ver como” de arriba.</p>
  if (!loading && user) return <Navigate to={next} replace />

  const phoneInfo = f.phone ? normalizePhone(f.phone) : null

  const validate = () => {
    if (mode === 'in') return f.id.trim() && f.password ? '' : 'Completá teléfono (o email) y contraseña'
    if (f.name.trim().length < 3 || !/[a-záéíóúñü]{2,}/i.test(f.name)) return 'Ingresá tu nombre y apellido'
    const p = normalizePhone(f.phone)
    if (!p.ok) return p.error
    if (f.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    if (f.password !== f.password2) return 'Las contraseñas no coinciden'
    return ''
  }

  const submit = async (e) => {
    e.preventDefault()
    const problem = validate()
    if (problem) return setMsg(problem)
    setBusy(true); setMsg('')
    if (mode === 'in') {
      const { error } = await signIn(f.id, f.password)
      setBusy(false)
      if (error) return setMsg(error.message)
      nav(next, { replace: true })
    } else {
      const { error, data } = await signUp({ name: f.name, phone: f.phone, password: f.password })
      setBusy(false)
      if (error) return setMsg(error.message)
      if (!data.session) return setMsg('La cuenta se creó pero requiere confirmación por email. El administrador debe desactivar “Confirm email” en Supabase (Authentication → Providers → Email).')
      nav(`/verificar?next=${encodeURIComponent(next)}`, { replace: true })
    }
  }

  return (
    <form className="panel form narrow" onSubmit={submit} noValidate>
      <h2>{mode === 'in' ? 'Ingresar' : 'Crear cuenta'}</h2>
      {mode === 'up' && <label>Nombre y apellido<input value={f.name} onChange={set('name')} autoComplete="name" /></label>}
      {mode === 'in' ? (
        <label>Teléfono (o email del personal)
          <input value={f.id} onChange={set('id', (v) => (v.includes('@') || /[a-z]/i.test(v) ? v : cleanPhoneInput(v)))} autoComplete="username" inputMode="text" placeholder="3794 265979" />
        </label>
      ) : (
        <label>Teléfono / WhatsApp
          <input value={f.phone} onChange={set('phone', cleanPhoneInput)} inputMode="tel" autoComplete="tel" placeholder="3794 265979" maxLength={20} />
          <small className={phoneInfo && !phoneInfo.ok ? 'danger' : 'muted'}>
            {phoneInfo ? (phoneInfo.ok ? `Se guardará como ${phoneInfo.pretty}` : phoneInfo.error) : 'Con código de área, sin 0 ni 15. Te vamos a enviar un código por WhatsApp.'}
          </small>
        </label>
      )}
      <label>Contraseña<input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
      {mode === 'up' && <label>Repetir contraseña<input type="password" value={f.password2} onChange={set('password2')} autoComplete="new-password" /></label>}
      {msg && <p className="alert">{msg}</p>}
      <button className="btn" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Entrar' : 'Registrarme'}</button>
      <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
        {mode === 'in' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}
      </button>
    </form>
  )
}
