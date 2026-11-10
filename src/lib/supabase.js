import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sin variables de entorno la app corre en modo demo (datos en localStorage)
export const hasSupabase = Boolean(url && key)
export const supabase = hasSupabase ? createClient(url, key) : null
