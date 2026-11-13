import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, hasSupabase } from './supabase'
import { normalizePhone, phoneToEmail } from './phone'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export const ROLES = { visitante: 'Visitante', cliente: 'Cliente', admin: 'Administrador', duena: 'Dueña' }

const demoUser = (role) =>
  role === 'visitante' ? null
    : { id: 'demo-' + role, email: role + '@demo', name: ROLES[role] + ' demo', phone: '5493794000000', phoneVerified: true }

const friendly = (msg = '') => {
  if (/invalid login/i.test(msg)) return 'Teléfono/email o contraseña incorrectos'
  if (/already registered|already been registered/i.test(msg)) return 'Ese teléfono ya tiene una cuenta. Ingresá con tu contraseña.'
  if (/email.*invalid|invalid.*email/i.test(msg)) return 'No se pudo crear la cuenta (email técnico rechazado). Avisá al administrador.'
  if (/Email not confirmed/i.test(msg)) return 'La cuenta requiere confirmación por email: el administrador debe desactivar “Confirm email” en Supabase.'
  return msg
}

export function AuthProvider({ children }) {
  const initialRole = !hasSupabase ? localStorage.getItem('vm_demo_role') || 'visitante' : 'visitante'
  const [user, setUser] = useState(() => (!hasSupabase ? demoUser(initialRole) : null))
  const [role, setRole] = useState(initialRole)
  const [loading, setLoading] = useState(hasSupabase)

  const loadProfile = useCallback(async (u) => {
    if (!u) { setUser(null); setRole('visitante'); return }
    let { data } = await supabase.from('profiles').select('role, full_name, phone, phone_verified').eq('id', u.id).maybeSingle()
    let missing = false
    if (!data) {
      // usuario sin perfil (p. ej. creado antes de correr el esquema): se crea como cliente
      missing = true
      const ins = await supabase.from('profiles').insert({ id: u.id, email: u.email, full_name: u.email?.split('@')[0] })
      if (!ins.error) missing = false
    }
    const r = data?.role ?? 'cliente'
    setUser({
      id: u.id, email: u.email, name: data?.full_name, phone: data?.phone ?? null,
      phoneVerified: Boolean(data?.phone_verified) || r === 'admin' || r === 'duena', profileMissing: missing
    })
    setRole(r)
  }, [])

  useEffect(() => {
    if (!hasSupabase) return undefined
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user).finally(() => setLoading(false)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { loadProfile(session?.user) })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = async () => {
    if (!hasSupabase) return
    const { data } = await supabase.auth.getSession()
    await loadProfile(data.session?.user)
  }

  // Ingresar con teléfono (clientes) o con email (administración / dueña)
  const signIn = async (idOrPhone, password) => {
    const id = String(idOrPhone).trim()
    let email = id
    if (!id.includes('@')) {
      const p = normalizePhone(id)
      if (!p.ok) return { error: { message: p.error } }
      email = phoneToEmail(p.value)
    }
    const res = await supabase.auth.signInWithPassword({ email, password })
    if (res.error) res.error.message = friendly(res.error.message)
    return res
  }

  const signUp = async ({ name, phone, password }) => {
    const p = normalizePhone(phone)
    if (!p.ok) return { error: { message: p.error } }
    const res = await supabase.auth.signUp({
      email: phoneToEmail(p.value), password, options: { data: { full_name: name.trim(), phone: p.value } }
    })
    if (res.error) res.error.message = friendly(res.error.message)
    return res
  }

  const clearLocal = () => ['vm_cart', 'vm_cust_name', 'vm_cust_phone'].forEach((k) => localStorage.removeItem(k))

  const setDemoRole = (r) => {
    localStorage.setItem('vm_demo_role', r)
    setRole(r); setUser(demoUser(r))
  }
  const signOut = async () => {
    clearLocal()
    if (hasSupabase) await supabase.auth.signOut()
    else setDemoRole('visitante')
  }

  const isStaff = role === 'admin' || role === 'duena'
  const isVerified = isStaff || Boolean(user?.phoneVerified)
  return (
    <AuthCtx.Provider value={{ user, role, isStaff, isVerified, loading, signIn, signUp, signOut, refreshProfile, setDemoRole, demo: !hasSupabase }}>
      {children}
    </AuthCtx.Provider>
  )
}
