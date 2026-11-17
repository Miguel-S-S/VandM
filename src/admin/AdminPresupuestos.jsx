import { useEffect, useMemo, useRef, useState } from 'react'
import { listProducts } from '../lib/data'
import { useSettings } from '../lib/settings'
import { normalizePhone, cleanPhoneInput } from '../lib/phone'
import { fmtMoney, fmtDay } from '../lib/format'
import { onPromo, todayAR } from '../lib/pricing'
import { buildQuotePdf, calcQuote, clampPct } from '../lib/presupuesto'

const DRAFT_KEY = 'vm_quote_draft'
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) ?? {} } catch { return {} } }
const plusDays = (n) => {
  const d = new Date(todayAR() + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const download = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Lista de precios y presupuestos en PDF: se eligen productos, se arma y se manda por WhatsApp
export default function AdminPresupuestos() {
  const { settings } = useSettings()
  const draft = useRef(loadDraft()).current
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const [mode, setMode] = useState(draft.mode ?? 'lista') // lista | presupuesto
  const [sel, setSel] = useState(draft.sel ?? {}) // variantId -> { qty, disc }
  const [client, setClient] = useState(draft.client ?? '')
  const [phone, setPhone] = useState(draft.phone ?? '')
  const [notes, setNotes] = useState(draft.notes ?? '')
  const [expires, setExpires] = useState(draft.expires ?? '')
  const [globalDisc, setGlobalDisc] = useState(draft.globalDisc ?? '')
  const [showDelivery, setShowDelivery] = useState(draft.showDelivery ?? true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const summaryRef = useRef(null)

  useEffect(() => { listProducts().then(setList).catch((e) => setError(e.message)) }, [])
  // el borrador queda guardado: si va a editar un precio y vuelve, no pierde lo armado
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ mode, sel, client, phone, notes, expires, globalDisc, showDelivery })) } catch { /* sin espacio */ }
  }, [mode, sel, client, phone, notes, expires, globalDisc, showDelivery])

  const cats = useMemo(() => [...new Set((list ?? []).map((p) => p.categoryName ?? p.category).filter(Boolean))], [list])
  const shown = useMemo(() => (list ?? []).filter((p) => {
    if (cat && (p.categoryName ?? p.category) !== cat) return false
    if (q.trim() && !p.name.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  }), [list, q, cat])

  // ítems elegidos, siempre con el precio vigente actual del producto
  const items = useMemo(() => {
    const out = []
    for (const p of list ?? []) {
      for (const v of p.variants) {
        const s = sel[v.id]
        if (s) out.push({ id: v.id, productId: p.id, productName: p.name, label: v.label ?? '', price: v.price, promo: onPromo(v), qty: s.qty, disc: s.disc })
      }
    }
    return out
  }, [list, sel])

  const quote = useMemo(() => calcQuote({ items, mode, globalDisc }), [items, mode, globalDisc])
  const full = mode === 'presupuesto'

  const toggle = (v) => setSel((s) => { const n = { ...s }; if (n[v.id]) delete n[v.id]; else n[v.id] = { qty: 1, disc: '' }; return n })
  const allOn = (p) => p.variants.length > 0 && p.variants.every((v) => sel[v.id])
  const toggleAll = (p) => setSel((s) => {
    const n = { ...s }
    if (allOn(p)) p.variants.forEach((v) => delete n[v.id])
    else p.variants.forEach((v) => { if (!n[v.id]) n[v.id] = { qty: 1, disc: '' } })
    return n
  })
  const setLine = (id, patch) => setSel((s) => ({ ...s, [id]: { ...s[id], ...patch } }))
  const selectShown = () => setSel((s) => { const n = { ...s }; shown.forEach((p) => p.variants.forEach((v) => { if (!n[v.id]) n[v.id] = { qty: 1, disc: '' } })); return n })
  const clearSel = () => setSel({})
  const clearAll = () => { setSel({}); setClient(''); setPhone(''); setNotes(''); setExpires(''); setGlobalDisc('') }

  const phoneInfo = phone.trim() ? normalizePhone(phone) : null
  const count = items.length

  const params = () => ({ mode, items, globalDisc, client: client.trim(), phone: phoneInfo?.ok ? phoneInfo.pretty : phone.trim(), notes, expires, settings, showDelivery })
  const guard = () => {
    setError(''); setInfo('')
    if (!count) { setError('Elegí al menos un producto para armar el PDF.'); return false }
    if (phoneInfo && !phoneInfo.ok) { setError(phoneInfo.error); return false }
    return true
  }
  const msgText = () => {
    const what = full ? 'el presupuesto' : 'la lista de precios'
    return `Hola${client.trim() ? ' ' + client.trim() : ''}! Te paso ${what} de ${settings?.storeName || 'V&M Artículos Deportivos'}.${expires ? ` Es válido hasta el ${fmtDay(expires)}.` : ''}`
  }

  const run = async (fn) => {
    if (!guard()) return
    setBusy(true)
    try { await fn(await buildQuotePdf(params())) } catch (e) { setError('No se pudo generar el PDF: ' + (e.message ?? e)) } finally { setBusy(false) }
  }

  const doDownload = () => run(async ({ blob, filename }) => { download(blob, filename); setInfo('PDF descargado.') })

  // Celular: abre el menú de compartir con el PDF adjunto (se elige WhatsApp y el contacto)
  const doShare = () => run(async ({ blob, filename }) => {
    const file = new File([blob], filename, { type: 'application/pdf' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: msgText() }); return } catch (e) { if (e?.name === 'AbortError') return }
    }
    download(blob, filename)
    setInfo('Tu dispositivo no permite compartir archivos desde acá: se descargó el PDF, adjuntalo manualmente en WhatsApp.')
  })

  // Abre el chat directo con el número cargado y deja el PDF descargado para adjuntarlo
  const doChat = () => {
    if (!phoneInfo?.ok) { setError(phoneInfo?.error ?? 'Cargá el WhatsApp del cliente para abrir su chat.'); return }
    return run(async ({ blob, filename }) => {
      download(blob, filename)
      window.open(`https://wa.me/${phoneInfo.value}?text=${encodeURIComponent(msgText())}`, '_blank', 'noopener')
      setInfo('Se descargó el PDF y se abrió el chat: tocá el clip (adjuntar) y elegí el archivo.')
    })
  }

  return (
    <>
      <div className="row between">
        <h2>Lista de precios</h2>
        <div className="pp-segment" role="tablist" aria-label="Tipo de documento">
          <button type="button" className={mode === 'lista' ? 'on' : ''} onClick={() => setMode('lista')}>Lista de precios</button>
          <button type="button" className={full ? 'on' : ''} onClick={() => setMode('presupuesto')}>Presupuesto</button>
        </div>
      </div>
      <p className="muted small">
        {full ? 'Presupuesto con cantidades, descuentos y total.' : 'Lista simple con los precios actuales.'} Marcá los productos que querés incluir, completá los datos y generá el PDF.
      </p>
      {error && <p className="alert">{error}</p>}
      {info && <p className="banner">{info}</p>}
      {!list && !error && <p className="muted">Cargando…</p>}

      <div className="pp-grid">
        <section>
          <div className="row" style={{ marginBottom: '.6rem' }}>
            <input type="search" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
            <button type="button" className="btn ghost" onClick={selectShown}>Marcar los {shown.length} visibles</button>
            <button type="button" className="btn ghost" onClick={clearSel} disabled={!count}>Desmarcar todo</button>
          </div>
          {cats.length > 1 && (
            <div className="row" style={{ marginBottom: '.6rem', gap: '.4rem' }}>
              <button type="button" className={'chip' + (!cat ? ' on' : '')} onClick={() => setCat('')}>Todas</button>
              {cats.map((c) => <button key={c} type="button" className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          )}
          <div style={{ display: 'grid', gap: '.7rem' }}>
            {shown.map((p) => (
              <div key={p.id} className="pp-prod">
                <div className="pp-prod-head">
                  <label className="check" style={{ fontWeight: 700 }}>
                    <input type="checkbox" checked={allOn(p)} onChange={() => toggleAll(p)} />
                    {p.name}
                    {p.isCombo && <span className="pill" style={{ background: '#3b82f6', color: '#fff' }}>Combo</span>}
                    {!p.active && <span className="pill off">Oculto</span>}
                  </label>
                  <small className="muted">{p.categoryName ?? p.category ?? ''}</small>
                </div>
                {p.variants.map((v) => {
                  const on = Boolean(sel[v.id])
                  return (
                    <label key={v.id} className={'pp-var' + (on ? ' on' : '') + (v.active ? '' : ' off')}>
                      <input type="checkbox" checked={on} onChange={() => toggle(v)} />
                      <span>{v.label || 'Único'}{!v.active && <small className="muted"> (inactiva)</small>}{v.stock <= 0 && <small className="danger"> sin stock</small>}</span>
                      <b>{fmtMoney(v.price)}{onPromo(v) && <span className="price-old">{fmtMoney(v.listPrice)}</span>}</b>
                    </label>
                  )
                })}
              </div>
            ))}
            {list && !shown.length && <p className="muted center">No hay productos que coincidan.</p>}
          </div>
        </section>

        <aside className="pp-side panel" ref={summaryRef}>
          <h3>Datos del {full ? 'presupuesto' : 'documento'}</h3>
          <div style={{ display: 'grid', gap: '.6rem' }}>
            <label>Nombre del interesado (opcional)
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ej: Juan Pérez" />
            </label>
            <label>WhatsApp del interesado (opcional)
              <input value={phone} inputMode="tel" onChange={(e) => setPhone(cleanPhoneInput(e.target.value))} placeholder="3794 265979" />
              {phoneInfo && (phoneInfo.ok ? <small className="muted">{phoneInfo.pretty}</small> : <small className="danger">{phoneInfo.error}</small>)}
            </label>
            <label>Vencimiento (opcional)
              <input type="date" min={todayAR()} value={expires} onChange={(e) => setExpires(e.target.value)} />
            </label>
            <div className="row" style={{ gap: '.4rem' }}>
              {[7, 15, 30].map((n) => <button key={n} type="button" className="chip" onClick={() => setExpires(plusDays(n))}>+{n} días</button>)}
              {expires && <button type="button" className="link muted" onClick={() => setExpires('')}>Quitar</button>}
            </div>
            {full && (
              <label>Descuento general (%)
                <input inputMode="decimal" value={globalDisc} onChange={(e) => setGlobalDisc(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0" />
              </label>
            )}
            <label>Observaciones
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Retiro por el local. Seña del 50% para confeccionar." />
            </label>
            {settings?.deliveryText && (
              <label className="check"><input type="checkbox" checked={showDelivery} onChange={(e) => setShowDelivery(e.target.checked)} /> Incluir el plazo de entrega</label>
            )}
          </div>

          <h3 style={{ marginTop: '1rem' }}>Seleccionados ({count})</h3>
          {!count && <p className="muted small">Todavía no marcaste productos.</p>}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {quote.lines.map((l) => (
              <div key={l.id} className="pp-sel" style={{ gridTemplateColumns: full ? '1fr auto auto auto' : '1fr auto auto' }}>
                <span>{l.productName}{l.label ? ` · ${l.label}` : ''}<br /><small className="muted">{fmtMoney(l.unit)}</small></span>
                {full && (
                  <>
                    <input className="pp-num" inputMode="numeric" aria-label="Cantidad" title="Cantidad" value={sel[l.id]?.qty ?? ''}
                      onChange={(e) => setLine(l.id, { qty: e.target.value.replace(/\D/g, '') })}
                      onBlur={() => setLine(l.id, { qty: Math.max(1, parseInt(sel[l.id]?.qty, 10) || 1) })} />
                    <input className="pp-num" inputMode="decimal" aria-label="Descuento %" title="Descuento %" placeholder="% off" value={sel[l.id]?.disc ?? ''}
                      onChange={(e) => setLine(l.id, { disc: e.target.value.replace(/[^\d.,]/g, '') })}
                      onBlur={() => setLine(l.id, { disc: sel[l.id]?.disc === '' ? '' : String(clampPct(sel[l.id]?.disc)) })} />
                  </>
                )}
                {!full && <b>{fmtMoney(l.unit)}</b>}
                <button type="button" className="link danger" aria-label="Quitar" onClick={() => setSel((s) => { const n = { ...s }; delete n[l.id]; return n })}>✕</button>
              </div>
            ))}
          </div>

          {full && count > 0 && (
            <div className="pp-tot">
              <div className="muted"><span>Subtotal</span><span>{fmtMoney(quote.subtotal)}</span></div>
              {quote.globalPct > 0 && <div style={{ color: 'var(--accent)' }}><span>Descuento {quote.globalPct}%</span><span>-{fmtMoney(quote.discAmount)}</span></div>}
              <div className="big"><span>Total</span><span>{fmtMoney(quote.total)}</span></div>
            </div>
          )}

          <div style={{ display: 'grid', gap: '.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn" onClick={doShare} disabled={busy}>{busy ? 'Generando…' : 'Compartir PDF por WhatsApp'}</button>
            <button type="button" className="btn wa" onClick={doChat} disabled={busy || !phoneInfo?.ok} title={phoneInfo?.ok ? '' : 'Cargá el WhatsApp del interesado'}>Abrir chat con el interesado</button>
            <button type="button" className="btn ghost" onClick={doDownload} disabled={busy}>Descargar PDF</button>
            <button type="button" className="link muted" onClick={clearAll}>Empezar de nuevo</button>
          </div>
          <p className="muted small" style={{ marginTop: '.6rem' }}>
            «Compartir» adjunta el PDF y abre el menú del celular (elegís WhatsApp y el contacto). «Abrir chat» descarga el PDF y abre la conversación con el número cargado para que lo adjuntes.
          </p>
        </aside>
      </div>

      {count > 0 && (
        <button type="button" className="pp-bar" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' })}>
          <span>{count} seleccionado{count === 1 ? '' : 's'}{full ? ` · ${fmtMoney(quote.total)}` : ''}</span>
          <b>Armar PDF ↓</b>
        </button>
      )}
    </>
  )
}