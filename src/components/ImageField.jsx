import { useRef, useState } from 'react'
import { uploadImage } from '../lib/data'
import { isIg, parseImageLink, igParts, withRatio, RATIOS } from '../lib/images'
import { IgFrame } from './Media'

// Una sola imagen (opcional): subir foto, o pegar un enlace (foto o publicación de Instagram)
export default function ImageField({ value, onChange, label = 'Imagen' }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [link, setLink] = useState('')
  const pick = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try { onChange(await uploadImage(f)) } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  const addLink = () => {
    try { onChange(parseImageLink(link)); setLink(''); setErr('') } catch (x) { setErr(x.message) }
  }
  return (
    <div className="full media-field">
      <span className="muted small">{label} (opcional)</span>
      {value && (
        <div className="row" style={{ margin: '.4rem 0', alignItems: 'flex-start' }}>
          {isIg(value)
            ? <IgFrame src={value} mini width={160} />
            : <img src={value} alt="" referrerPolicy="no-referrer" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 10 }} />}
          <div style={{ display: 'grid', gap: '.4rem' }}>
            {isIg(value) && (
              <label>Encuadre
                <select value={igParts(value).ratio} onChange={(e) => onChange(withRatio(value, e.target.value))}>
                  {RATIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            )}
            <button type="button" className="link danger" onClick={() => onChange('')}>Quitar</button>
          </div>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => ref.current.click()} disabled={busy}>
          {busy ? 'Subiendo…' : value ? 'Cambiar foto' : '+ Subir foto'}
        </button>
        <input style={{ flex: 1, minWidth: 180 }} value={link} onChange={(e) => setLink(e.target.value)}
          placeholder="…o pegá un enlace (foto o publicación de Instagram)"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
        <button type="button" className="btn ghost" onClick={addLink}>Usar enlace</button>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      {err && <p className="alert">{err}</p>}
    </div>
  )
}
