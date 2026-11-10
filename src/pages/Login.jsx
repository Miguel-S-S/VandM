import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn, signUp, demo } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('in')
  const [f, setF] = useState({ email: '', password: '', name: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (demo) return <p className="center">En modo demo no hace falta iniciar sesión: usá el selector “Ver como” de arriba.</p>

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error, data } = mode === 'in' ? await signIn(f.email, f.password) : await signUp(f.email, f.password, f.name)
    setBusy(false)
    if (error) return setMsg(error.message)
    if (mode === 'up' && !data.session) return setMsg('Listo. Revisá tu mail para confirmar la cuenta.')
    nav('/')
  }

  return (
    <form className="panel form narrow" onSubmit={submit}>
      <h2>{mode === 'in' ? 'Ingresar' : 'Crear cuenta'}</h2>
      {mode === 'up' && <label>Nombre<input value={f.name} onChange={set('name')} required /></label>}
      <label>Email<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></label>
      <label>Contraseña<input type="password" value={f.password} onChange={set('password')} required minLength={6}
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
      {msg && <p className="alert">{msg}</p>}
      <button className="btn" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Entrar' : 'Registrarme'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}
      </button>
    </form>
  )
}
