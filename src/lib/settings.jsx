import { createContext, useContext, useEffect, useState } from 'react'
import { getSettings } from './data'
import { DEFAULT_SETTINGS, FONTS } from './demoData'

const SettingsCtx = createContext(null)
export const useSettings = () => useContext(SettingsCtx)

// Aplica el tema (colores, fuentes, radio) como variables CSS
export function applyTheme(t) {
  const r = document.documentElement.style
  r.setProperty('--bg', t.bg)
  r.setProperty('--surface', t.surface)
  r.setProperty('--surface-2', t.surface2)
  r.setProperty('--border', t.border)
  r.setProperty('--text', t.text)
  r.setProperty('--muted', t.muted)
  r.setProperty('--accent', t.accent)
  r.setProperty('--accent-text', t.accentText)
  r.setProperty('--danger', t.danger)
  r.setProperty('--radius', `${t.radius}px`)
  r.setProperty('--font', (FONTS[t.font] ?? FONTS.system).css)
  r.setProperty('--font-heading', (FONTS[t.headingFont] ?? FONTS.system).css)

  const families = [...new Set([t.font, t.headingFont])].map((k) => FONTS[k]?.google).filter(Boolean)
  let link = document.getElementById('vm-fonts')
  if (!families.length) { link?.remove() } else {
    if (!link) { link = document.createElement('link'); link.id = 'vm-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link) }
    link.href = `https://fonts.googleapis.com/css2?${families.map((f) => 'family=' + f).join('&')}&display=swap`
  }
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg)
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => { applyTheme(DEFAULT_SETTINGS.theme) }, [])
  useEffect(() => {
    getSettings().then((s) => { setSettings(s); applyTheme(s.theme) }).catch(console.error).finally(() => setReady(true))
  }, [])

  const update = (s) => { setSettings(s); applyTheme(s.theme) }
  return <SettingsCtx.Provider value={{ settings, update, ready }}>{children}</SettingsCtx.Provider>
}
