import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, hasSupabase } from './supabase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export const ROLES = { visitante: 'Visitante', cliente: 'Cliente', admin: 'Administrador', duena: 'Dueña' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('visitante')
  const [loading, setLoading] = useState(hasSupabase)

  const loadProfile = useCallback(async (u) => {
    if (!u) { setUser(null); setRole('visitante'); return }
    const { data } = await supabase.from('profiles').select('role, full_name').eq('id', u.id).maybeSingle()
    setUser({ id: u.id, email: u.email, name: data?.full_name })
    setRole(data?.role ?? 'cliente')
  }, [])

  useEffect(() => {
    if (!hasSupabase) {
      setRole(localStorage.getItem('vm_demo_role') || 'visitante')
      return
    }
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user).finally(() => setLoading(false)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => loadProfile(session?.user))
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, full_name) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name } } })
  const signOut = () => (hasSupabase ? supabase.auth.signOut() : setDemoRole('visitante'))

  // solo modo demo: permite probar los 3 perfiles sin base de datos
  const setDemoRole = (r) => { localStorage.setItem('vm_demo_role', r); setRole(r) }

  const isStaff = role === 'admin' || role === 'duena'
  return (
    <AuthCtx.Provider value={{ user, role, isStaff, loading, signIn, signUp, signOut, setDemoRole, demo: !hasSupabase }}>
      {children}
    </AuthCtx.Provider>
  )
}
