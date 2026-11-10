import { useRef, useState } from 'react'
import { uploadImage } from '../lib/data'

// Una sola foto (opcional) con subir / quitar
export default function ImageField({ value, onChange, label = 'Foto' }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setBusy(true); setErr('')
    try { onChange(await uploadImage(f)) } catch (x) { setErr(x.message) }
    setBusy(false); ref.current.value = ''
  }
  return (
    <div className="full">
      <span className="muted small">{label} (opcional)</span>
      <div className="row" style={{ marginTop: '.3rem' }}>
        {value && <img src={value} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10 }} />}
        <button type="button" className="btn ghost" onClick={() => ref.current.click()} disabled={busy}>
          {busy ? 'Subiendo…' : value ? 'Cambiar foto' : '+ Agregar foto'}
        </button>
        {value && <button type="button" className="link danger" onClick={() => onChange('')}>Quitar</button>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={pick} />
      {err && <p className="alert">{err}</p>}
    </div>
  )
}
