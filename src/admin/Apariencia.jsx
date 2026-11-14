import { useState } from 'react'
import { useSettings, applyTheme } from '../lib/settings'
import { saveSettings } from '../lib/data'
import { DEFAULT_SETTINGS, FONTS } from '../lib/demoData'
import { useConfirm } from '../components/Confirm'

const COLORS = [
  ['bg', 'Fondo'], ['surface', 'Tarjetas'], ['surface2', 'Tarjetas (2)'], ['border', 'Bordes'],
  ['text', 'Texto'], ['muted', 'Texto secundario'], ['accent', 'Color principal (naranja)'],
  ['accentText', 'Texto sobre principal'], ['danger', 'Rojo (ofertas / alertas)']
]

export default function Apariencia() {
  const ask = useConfirm()
  const { settings, update } = useSettings()
  const [s, setS] = useState(settings)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const setTheme = (k, v) => { const n = { ...s, theme: { ...s.theme, [k]: v } }; setS(n); applyTheme(n.theme) }
  const setTop = (k, v) => setS({ ...s, [k]: v })
  const setSocial = (k, v) => setS({ ...s, social: { ...s.social, [k]: v } })

  const save = async () => {
    if (!(await ask.update('la apariencia y los datos del negocio', ['Los cambios los verán todos los visitantes.']))) return
    setBusy(true); setMsg('')
    try { await saveSettings(s); update(s); setMsg('Guardado ✓') } catch (e) { setMsg(e.message) }
    setBusy(false)
  }
  const reset = () => { setS({ ...s, theme: DEFAULT_SETTINGS.theme }); applyTheme(DEFAULT_SETTINGS.theme) }

  return (
    <div className="form">
      <h2>Apariencia y datos del negocio</h2>

      <div className="panel form-grid">
        <label>Nombre del negocio<input value={s.storeName} onChange={(e) => setTop('storeName', e.target.value)} /></label>
        <label>Frase corta<input value={s.tagline} onChange={(e) => setTop('tagline', e.target.value)} /></label>
        <label>WhatsApp (con código de país, sin +)
          <input value={s.whatsapp} onChange={(e) => setTop('whatsapp', e.target.value.replace(/\D/g, ''))} placeholder="5493794123456" inputMode="numeric" />
        </label>
        <label>Tiempo estimado de entrega (texto visible)<input value={s.deliveryText} onChange={(e) => setTop('deliveryText', e.target.value)} /></label>
        <label>Días para calcular la fecha estimada de cada pedido
          <input type="number" min="1" max="90" value={s.deliveryDays ?? 7} onChange={(e) => setTop('deliveryDays', Number(e.target.value) || 7)} />
        </label>
      </div>

      <div className="panel form-grid">
        <h3 className="full">Redes sociales</h3>
        {Object.keys(s.social).map((k) => (
          <label key={k}>{k[0].toUpperCase() + k.slice(1)}
            <input type="url" value={s.social[k]} onChange={(e) => setSocial(k, e.target.value)} placeholder="https://…" />
          </label>
        ))}
      </div>

      <div className="panel">
        <div className="row between"><h3>Colores y tipografía</h3><button className="link" onClick={reset}>Restaurar paleta</button></div>
        <p className="muted small">Los cambios se ven al instante; se aplican a todos al guardar.</p>
        <div className="colors">
          {COLORS.map(([k, label]) => (
            <label key={k} className="color">
              <input type="color" value={s.theme[k]} onChange={(e) => setTheme(k, e.target.value)} />
              <span>{label}<small>{s.theme[k]}</small></span>
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>Fuente general
            <select value={s.theme.font} onChange={(e) => setTheme('font', e.target.value)}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label>Fuente de títulos
            <select value={s.theme.headingFont} onChange={(e) => setTheme('headingFont', e.target.value)}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label>Redondeo de bordes ({s.theme.radius}px)
            <input type="range" min="0" max="28" value={s.theme.radius} onChange={(e) => setTheme('radius', Number(e.target.value))} />
          </label>
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
    </div>
  )
}
