import { isIg, igParts, igEmbedUrl } from '../lib/images'

// Alto (px) de la cabecera del visor de Instagram que se recorta. Si Instagram cambia su diseño, ajustá este valor.
const IG_HEADER = 54
const BASE = 400 // ancho "lógico" del visor de Instagram

// Muestra solo la imagen/video de una publicación de Instagram, recortando cabecera y pie.
// mini = versión reducida (vista previa del panel).
export function IgFrame({ src, mini = false, width = 200 }) {
  const { ratio } = igParts(src)
  const [w, h] = ratio.split(':').map(Number)
  const aspect = `${w} / ${h}`
  const inner = (
    <>
      <iframe
        src={igEmbedUrl(src)} title="Instagram" loading="lazy" scrolling="no" allowtransparency="true"
        style={{ position: 'absolute', left: -1, top: -IG_HEADER, width: 'calc(100% + 2px)', height: 1200, border: 0 }}
      />
    </>
  )
  if (!mini) {
    return <div className="ig-frame" style={{ aspectRatio: aspect }}>{inner}</div>
  }
  const scale = width / BASE
  return (
    <div className="ig-frame mini" style={{ width, height: (BASE * h) / w * scale }}>
      <div style={{ width: BASE, height: (BASE * h) / w, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'relative' }}>
        {inner}
      </div>
    </div>
  )
}

// Foto normal o publicación de Instagram, según lo que esté guardado
export default function Media({ src, alt = '', className = 'news-img' }) {
  if (!src) return null
  if (isIg(src)) return <div className="media-ig"><IgFrame src={src} /></div>
  return <img className={className} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" />
}
