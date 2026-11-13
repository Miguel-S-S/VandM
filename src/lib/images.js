// Las "imágenes" de un producto pueden ser:
//  - una URL normal (Supabase Storage, Cloudinary, Imgur, etc.)  -> se muestra como foto
//  - "ig:p/CODIGO" o "ig:reel/CODIGO" (publicación de Instagram)  -> se muestra incrustada (embed oficial)
//  - "yt:ID" (video de YouTube)  -> se muestra incrustado
export const isIg = (s) => typeof s === 'string' && s.startsWith('ig:')
// Formato: "ig:p/CODIGO" o "ig:p/CODIGO|4:5" (el sufijo es el encuadre elegido)
export const RATIOS = [
  ['4:5', 'Vertical 4:5'], ['1:1', 'Cuadrado 1:1'], ['9:16', 'Reel vertical 9:16'],
  ['5:4', 'Horizontal 5:4'], ['16:9', 'Panorámico 16:9']
]
export const igParts = (s) => {
  const [path, ratio] = s.slice(3).split('|')
  return { path, ratio: ratio || (path.startsWith('reel') ? '9:16' : '4:5') }
}
export const igEmbedUrl = (s) => `https://www.instagram.com/${igParts(s).path}/embed`
export const igPostUrl = (s) => `https://www.instagram.com/${igParts(s).path}/`
export const withRatio = (s, r) => `ig:${igParts(s).path}|${r}`
export const sameMedia = (a, b) =>
  isIg(a) && isIg(b) ? igParts(a).path === igParts(b).path : isYt(a) && isYt(b) ? ytParts(a).id === ytParts(b).id : a === b
export const isYt = (s) => typeof s === 'string' && s.startsWith('yt:')
export const ytParts = (s) => { const [id, ratio] = s.slice(3).split('|'); return { id, ratio: ratio || '16:9' } }
export const ytEmbedUrl = (s) => `https://www.youtube-nocookie.com/embed/${ytParts(s).id}?rel=0&modestbranding=1&playsinline=1`
export const ytWatchUrl = (s) => `https://www.youtube.com/watch?v=${ytParts(s).id}`
export const ytThumb = (s) => `https://img.youtube.com/vi/${ytParts(s).id}/hqdefault.jpg`
export const isEmbed = (s) => isIg(s) || isYt(s)
export const photosOf = (images = []) => images.filter((i) => !isEmbed(i))
export const ytOf = (images = []) => images.filter(isYt)
export const igOf = (images = []) => images.filter(isIg)
export const coverOf = (images = []) => photosOf(images)[0] ?? (ytOf(images)[0] ? ytThumb(ytOf(images)[0]) : null)

// Acepta un enlace y devuelve el texto a guardar, o lanza un error legible
export function parseImageLink(raw) {
  const url = raw.trim()
  if (!url) throw new Error('Pegá un enlace')
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i)
  if (yt) return `yt:${yt[1]}${/youtube\.com\/shorts\//i.test(url) ? '|9:16' : ''}`
  if (/youtube\.com|youtu\.be/i.test(url)) throw new Error('Pegá el enlace de un video de YouTube (…/watch?v=XXXX o youtu.be/XXXX)')
  const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i)
  if (m) return `ig:${m[1].toLowerCase() === 'tv' ? 'tv' : m[1].toLowerCase()}/${m[2]}`
  if (/instagram\.com/i.test(url)) throw new Error('Pegá el enlace de una publicación o reel de Instagram (…/p/XXXX o …/reel/XXXX)')
  if (!/^https?:\/\//i.test(url)) throw new Error('El enlace debe empezar con https://')
  return url
}
