// Lista de precios / presupuesto en PDF (jsPDF, se genera en el navegador, sin servidor).
// jsPDF se carga recién al generar el PDF para no engordar el resto de la app.
import { fmtDay } from './format'

const ACCENT = [217, 119, 87]
const BLACK = [0, 0, 0]
const DARK = [34, 34, 34]
const GRAY = [115, 115, 115]
const LIGHT = [248, 242, 238]
const LINE = [228, 222, 217]
const WHITE = [255, 255, 255]

// $ 1.234 (sin depender del locale del navegador)
export const money = (n) => '$' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const clampPct = (v) => Math.min(100, Math.max(0, Number(String(v ?? '').replace(',', '.')) || 0))

// items: [{ productId, productName, label, price, qty, disc, promo }]
export function calcQuote({ items, mode, globalDisc }) {
  const full = mode === 'presupuesto'
  const lines = items.map((it) => {
    const qty = full ? Math.max(1, parseInt(it.qty, 10) || 1) : 1
    const disc = full ? clampPct(it.disc) : 0
    const unit = Number(it.price) || 0
    const unitNet = unit * (1 - disc / 100)
    return { ...it, qty, disc, unit, unitNet, subtotal: Math.round(unitNet * qty) }
  })
  const subtotal = lines.reduce((n, l) => n + l.subtotal, 0)
  const globalPct = full ? clampPct(globalDisc) : 0
  const discAmount = Math.round((subtotal * globalPct) / 100)
  return { lines, subtotal, globalPct, discAmount, total: subtotal - discAmount }
}

async function loadLogo() {
  try {
    const blob = await (await fetch('/logo.jpg')).blob()
    const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob) })
    const ratio = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth / i.naturalHeight); i.onerror = () => res(1.45); i.src = dataUrl })
    return { dataUrl, ratio }
  } catch { return null }
}

const igHandle = (url) => {
  const m = String(url ?? '').match(/instagram\.com\/([\w.]+)/i)
  return m ? '@' + m[1] : ''
}

const safeName = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')

// Arma el PDF. `logo` opcional ({dataUrl, ratio}) para pruebas; si no, se carga /logo.jpg
export function renderQuotePdf(opts, logo, JsPDF) {
  const { mode, items, globalDisc, client, phone, notes, expires, settings, showDelivery } = opts
  const full = mode === 'presupuesto'
  const q = calcQuote({ items, mode, globalDisc })
  const anyDisc = full && q.lines.some((l) => l.disc > 0)
  const storeName = settings?.storeName || 'V&M Artículos Deportivos'
  const title = full ? 'PRESUPUESTO' : 'LISTA DE PRECIOS'
  const now = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  const number = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`
  const today = `${p2(now.getDate())}/${p2(now.getMonth() + 1)}/${now.getFullYear()}`

  const doc = new JsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 14, CW = W - M * 2
  const setC = (c) => doc.setTextColor(c[0], c[1], c[2])
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const draw = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const text = (t, x, y, o) => doc.text(String(t), x, y, o)

  /* ---------- cabecera ---------- */
  const drawHeader = (first) => {
    const bandH = first ? 42 : 18
    fill(BLACK); doc.rect(0, 0, W, bandH, 'F')
    fill(ACCENT); doc.rect(0, bandH, W, first ? 1.8 : 1, 'F')
    const lh = first ? 34 : 13
    if (logo) doc.addImage(logo.dataUrl, 'JPEG', M, (bandH - lh) / 2, lh * logo.ratio, lh)
    else { setC(WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(first ? 22 : 12); text('V&M', M, bandH / 2 + 3) }
    doc.setFont('helvetica', 'bold'); setC(WHITE)
    if (first) {
      doc.setFontSize(23); text(title, W - M, 20, { align: 'right' })
      doc.setFontSize(9.5); setC(ACCENT); doc.setFont('helvetica', 'normal')
      text(storeName.toUpperCase(), W - M, 27.5, { align: 'right' })
      const ig = igHandle(settings?.social?.instagram)
      if (ig) { setC([190, 190, 190]); doc.setFontSize(9); text(ig, W - M, 33, { align: 'right' }) }
    } else {
      doc.setFontSize(12); text(title, W - M, 11.5, { align: 'right' })
    }
    return bandH + (first ? 1.8 : 1)
  }

  /* ---------- tabla ---------- */
  const cols = full
    ? anyDisc ? { qty: 16, unit: 28, disc: 18, sub: 30 } : { qty: 18, unit: 32, sub: 34 }
    : { unit: 40 }
  const xRight = W - M
  const xSub = xRight - 2
  const xDisc = anyDisc ? xSub - cols.sub - 1 : null
  const xUnit = (anyDisc ? xDisc - cols.disc : xSub - (cols.sub ?? 0)) - 1
  const xQty = full ? xUnit - cols.unit - 1 : null

  let y = drawHeader(true) + 8

  const tableHead = () => {
    fill(DARK); doc.rect(M, y, CW, 8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setC(WHITE)
    text('PRODUCTO', M + 3, y + 5.3)
    if (full) {
      text('CANT.', xQty - cols.qty / 2 + 1, y + 5.3, { align: 'center' })
      text('PRECIO UNIT.', xUnit, y + 5.3, { align: 'right' })
      if (anyDisc) text('DESC.', xDisc - cols.disc / 2 + 6, y + 5.3, { align: 'center' })
      text('SUBTOTAL', xSub, y + 5.3, { align: 'right' })
    } else text('PRECIO', xRight - 3, y + 5.3, { align: 'right' })
    y += 8
  }

  const newPage = () => {
    doc.addPage(); y = drawHeader(false) + 8; tableHead()
  }
  const ensure = (h) => { if (y + h > H - 20) { newPage(); return true } return false }

  /* ---------- datos del cliente y fechas ---------- */
  fill(LIGHT); draw(LINE); doc.roundedRect(M, y - 2, CW, 22, 2, 2, 'FD')
  const label = (t, x, yy) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setC(ACCENT); text(t, x, yy) }
  const value = (t, x, yy, sz = 11) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(sz); setC(DARK); text(t, x, yy) }
  label('PARA', M + 4, y + 3.5)
  value((client || 'Cliente').slice(0, 34), M + 4, y + 10)
  if (phone) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setC(GRAY); text(phone, M + 4, y + 15.5) }
  const cx = M + CW * 0.55
  label('FECHA', cx, y + 3.5); value(today, cx, y + 10)
  label('N°', cx, y + 14.5); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); setC(GRAY); text(number, cx + 8, y + 14.5)
  if (expires) {
    const vx = M + CW * 0.8
    label('VÁLIDO HASTA', vx, y + 3.5)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); setC(ACCENT); text(fmtDay(expires), vx, y + 10)
  }
  y += 28
  tableHead()

  /* ---------- filas agrupadas por producto ---------- */
  const groups = []
  for (const l of q.lines) {
    const g = groups[groups.length - 1]
    if (g && g.id === l.productId) g.lines.push(l)
    else groups.push({ id: l.productId, name: l.productName, lines: [l] })
  }

  const rowValues = (l, rowY) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setC(DARK)
    if (full) {
      text(l.qty, xQty - cols.qty / 2 + 1, rowY, { align: 'center' })
      text(money(l.unit), xUnit, rowY, { align: 'right' })
      if (anyDisc) { setC(l.disc ? ACCENT : GRAY); text(l.disc ? `-${String(l.disc).replace('.', ',')}%` : '-', xDisc - cols.disc / 2 + 6, rowY, { align: 'center' }); setC(DARK) }
      doc.setFont('helvetica', 'bold'); text(money(l.subtotal), xSub, rowY, { align: 'right' })
    } else {
      doc.setFont('helvetica', 'bold'); text(money(l.unit), xRight - 3, rowY, { align: 'right' })
    }
  }
  const oferta = (l, x, rowY) => {
    if (!l.promo) return
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setC(ACCENT); text('OFERTA', x, rowY - 0.4)
  }

  for (const g of groups) {
    const single = g.lines.length === 1
    if (single) {
      const l = g.lines[0]
      const name = l.label ? `${g.name} - ${l.label}` : g.name
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
      const maxW = (full ? xQty - cols.qty : xRight - 45) - M - 6 - (l.promo ? 14 : 0)
      const wrapped = doc.splitTextToSize(name, maxW).slice(0, 2)
      const rh = wrapped.length > 1 ? 12 : 8
      ensure(rh)
      draw(LINE); doc.line(M, y + rh, M + CW, y + rh)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setC(DARK)
      const ty = wrapped.length > 1 ? y + 4.8 : y + 5.4
      wrapped.forEach((t, i) => text(t, M + 3, ty + i * 4.4))
      oferta(l, M + 3 + doc.getTextWidth(wrapped[wrapped.length - 1]) + 2, ty + (wrapped.length - 1) * 4.4)
      rowValues(l, y + rh / 2 + 1.4)
      y += rh
      continue
    }
    const head = (cont) => {
      fill(LIGHT); doc.rect(M, y, CW, 7.5, 'F')
      fill(ACCENT); doc.rect(M, y, 1.2, 7.5, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); setC(DARK)
      text(g.name + (cont ? ' (cont.)' : ''), M + 4, y + 5.1)
      y += 7.5
    }
    ensure(7.5 + 7.5); head(false)
    for (const l of g.lines) {
      if (ensure(7.5)) head(true)
      draw(LINE); doc.line(M, y + 7.5, M + CW, y + 7.5)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setC(DARK)
      const lab = l.label || 'Único'
      text(lab, M + 8, y + 5)
      oferta(l, M + 8 + doc.getTextWidth(lab) + 2, y + 5)
      rowValues(l, y + 5)
      y += 7.5
    }
  }
  if (!groups.length) { setC(GRAY); doc.setFontSize(10); text('Sin productos seleccionados', M + 3, y + 7); y += 12 }

  /* ---------- totales ---------- */
  y += 5
  if (full) {
    const bw = 84, bx = W - M - bw
    const extra = q.globalPct > 0 ? 6.5 : 0
    ensure(9 + extra + 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); setC(GRAY)
    if (q.globalPct > 0) {
      text('Subtotal', bx + 3, y + 4); setC(DARK); text(money(q.subtotal), W - M - 3, y + 4, { align: 'right' })
      setC(ACCENT); text(`Descuento ${String(q.globalPct).replace('.', ',')}%`, bx + 3, y + 10.5)
      text('-' + money(q.discAmount), W - M - 3, y + 10.5, { align: 'right' })
      y += 13
    }
    fill(BLACK); doc.roundedRect(bx, y, bw, 12, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setC(WHITE); text('TOTAL', bx + 4, y + 7.7)
    doc.setFontSize(15); setC(ACCENT); text(money(q.total), W - M - 4, y + 8, { align: 'right' })
    y += 18
  }

  /* ---------- vigencia, observaciones y condiciones ---------- */
  if (expires) {
    ensure(14)
    draw(ACCENT); doc.setLineWidth(0.5); doc.roundedRect(M, y, CW, 10, 2, 2, 'S'); doc.setLineWidth(0.2)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setC(ACCENT)
    text(`${full ? 'Presupuesto válido' : 'Precios vigentes'} hasta el ${fmtDay(expires)}`, W / 2, y + 6.5, { align: 'center' })
    y += 15
  }
  const obs = String(notes ?? '').trim()
  if (obs) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(obs, CW - 6)
    ensure(8 + lines.length * 4.6)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setC(ACCENT); text('OBSERVACIONES', M, y + 3)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); setC(DARK)
    let yy = y + 9
    for (const ln of lines) {
      if (yy > H - 22) { doc.addPage(); drawHeader(false); yy = 30; setC(DARK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5) }
      text(ln, M + 3, yy); yy += 4.6
    }
    y = yy + 4
  }
  const conds = ['Precios expresados en pesos argentinos (ARS).']
  if (showDelivery && settings?.deliveryText) conds.push(settings.deliveryText)
  ensure(conds.length * 4.5 + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); setC(GRAY)
  for (const c of conds) { text(c, M, y + 3); y += 4.5 }

  /* ---------- pie de página en todas las hojas ---------- */
  const total = doc.getNumberOfPages()
  const contact = [igHandle(settings?.social?.instagram), settings?.whatsapp ? `WhatsApp +${settings.whatsapp}` : ''].filter(Boolean).join('   |   ')
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    fill(ACCENT); doc.rect(M, H - 13, CW, 0.5, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setC(GRAY)
    text(contact ? `${storeName}   |   ${contact}` : storeName, M, H - 8)
    text(`Página ${i} de ${total}`, W - M, H - 8, { align: 'right' })
  }

  const filename = `${full ? 'Presupuesto' : 'Lista-de-precios'}-VyM${client ? '-' + safeName(client) : ''}-${number.slice(0, 8)}.pdf`
  return { blob: doc.output('blob'), filename, totals: q }
}

export async function buildQuotePdf(opts) {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()])
  return renderQuotePdf(opts, logo, jsPDF)
}