import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { coverOf } from '../lib/images'
import { fmtMoney } from '../lib/format'
import { Photo, Badges, fromPrice } from './ProductCard'

const GAP = 16
const spring = { type: 'spring', stiffness: 260, damping: 32 }

// Cada tarjeta se achica y se atenúa según qué tan lejos está del centro (usa el MotionValue `x` del carril, sin re-renderizar)
function Slide({ p, i, x, step, cw, viewW, dragged, flat }) {
  const center = (latest) => (flat ? 0 : Math.abs(viewW / 2 - (latest + i * step + cw / 2)) / step) // 0 = centrada, 1 = una tarjeta al costado
  const scale = useTransform(x, (l) => 1 - Math.min(center(l), 1) * 0.1)
  const opacity = useTransform(x, (l) => 1 - Math.min(center(l), 1) * 0.45)
  const from = fromPrice(p)
  return (
    // entra con fundido cuando aparece en pantalla (whileInView)
    <motion.div className="cr-slide" style={{ width: cw }}
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.06 }}>
      <motion.div style={{ scale, opacity, height: '100%' }} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
        <Link to={p.isCombo ? '/?cat=combos' : p.category ? `/?cat=${p.category}` : '/'} className="cr-card" draggable={false}
          onClick={(e) => { if (dragged.current) e.preventDefault() }}>
          <div className="card-img">
            <Photo src={coverOf(p.images)} alt={p.name} />
            <Badges p={p} />
          </div>
          <div className="card-body">
            <h3>{p.name}</h3>
            <p className="small muted" style={{ margin: 0 }}>Ver {p.isCombo ? 'combos' : (p.categoryName ?? 'productos')} →</p>
            <p className="price">{from ? <>{p.isCombo ? '' : 'Desde '}<b>{fmtMoney(from.price)}</b>{from.was && <span className="price-old">{fmtMoney(from.was)}</span>}</> : 'Consultar'}</p>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  )
}

export default function ProductCarousel({ title, products, autoplayMs = 4500 }) {
  const reduce = useReducedMotion()
  const viewRef = useRef(null)
  const x = useMotionValue(0)
  const dragged = useRef(false)
  const [viewW, setViewW] = useState(0)
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = products.length
  const mounted = n >= 1 // el carrusel no se dibuja sin productos; hay que medir recién cuando aparece

  useEffect(() => {
    const el = viewRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setViewW(el.clientWidth))
    ro.observe(el); setViewW(el.clientWidth)
    return () => ro.disconnect()
  }, [mounted])

  const cw = Math.min(280, Math.max(190, viewW * 0.72))
  const step = cw + GAP
  const contentW = n * step - GAP
  const fits = contentW <= viewW // si entran todas, no hace falta desplazar
  // posición del carril para centrar la tarjeta k (sin dejar huecos al principio ni al final)
  const pos = useCallback((k) => (fits ? (viewW - contentW) / 2 : Math.max(viewW - contentW, Math.min(0, viewW / 2 - cw / 2 - k * step))), [fits, viewW, contentW, cw, step])
  // paradas distintas del carril (en los extremos varias tarjetas comparten la misma posición)
  const stops = useMemo(() => {
    const out = []; let last = null
    for (let k = 0; k < n; k++) { const v = Math.round(pos(k)); if (v !== last) { out.push(k); last = v } }
    return out
  }, [n, pos])
  const last = stops.length - 1
  const go = useCallback((i) => {
    const c = Math.max(0, Math.min(last, i))
    setIdx(c)
    const t = pos(stops[c])
    if (reduce) x.set(t); else animate(x, t, spring)
  }, [last, reduce, pos, stops, x])

  // al medir o redimensionar, vuelve a ubicar la parada actual
  useEffect(() => { if (viewW) { const c = Math.min(idx, last); setIdx(c); x.set(pos(stops[c])) } }, [viewW, n]) // eslint-disable-line react-hooks/exhaustive-deps

  // pasa sola cada unos segundos (se frena al tocar/pasar el mouse, con la pestaña oculta o si el usuario pidió menos movimiento)
  useEffect(() => {
    if (reduce || paused || last < 1 || !viewW) return undefined
    const t = setInterval(() => { if (!document.hidden) go(idx >= last ? 0 : idx + 1) }, autoplayMs)
    return () => clearInterval(t)
  }, [reduce, paused, last, viewW, idx, go, autoplayMs])

  const onDragEnd = (_, info) => {
    const projected = x.get() + info.velocity.x * 0.18
    let best = 0
    stops.forEach((k, i) => { if (Math.abs(pos(k) - projected) < Math.abs(pos(stops[best]) - projected)) best = i })
    go(best)
    setTimeout(() => { dragged.current = false }, 60)
    setPaused(false)
  }

  if (n < 1) return null
  return (
    <section className="cr" aria-roledescription="carrusel" aria-label={title}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="cr-head">
        <h2>{title}</h2>
        <div className="cr-ctrl">
          {last > 0 && <>
            <button type="button" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Anterior">‹</button>
            <button type="button" onClick={() => go(idx + 1)} disabled={idx === last} aria-label="Siguiente">›</button>
          </>}
        </div>
      </div>
      <div className="cr-view" ref={viewRef}>
        {viewW > 0 && (
          <motion.div className="cr-track" style={{ x }} drag={fits ? false : 'x'} dragElastic={0.12} dragMomentum={false}
            dragConstraints={{ left: viewW - contentW, right: 0 }}
            onDragStart={() => { dragged.current = true; setPaused(true) }} onDragEnd={onDragEnd}>
            {products.map((p, i) => <Slide key={p.id} p={p} i={i} x={x} step={step} cw={cw} viewW={viewW} dragged={dragged} flat={fits} />)}
          </motion.div>
        )}
      </div>
      {last > 0 && (
        <div className="cr-dots">
          {stops.map((k, i) => <button key={products[k].id} type="button" className={i === idx ? 'on' : ''} onClick={() => go(i)} aria-label={`Ir a ${products[k].name}`} />)}
        </div>
      )}
    </section>
  )
}
