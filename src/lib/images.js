// Las "imágenes" de un producto pueden ser:
//  - una URL normal (Supabase Storage, Cloudinary, Imgur, etc.)  -> se muestra como foto
//  - "ig:p/CODIGO" o "ig:reel/CODIGO" (publicación de Instagram)  -> se muestra incrustada (embed oficial)
export const isIg = (s) => typeof s === 'string' && s.startsWith('ig:')
export const igEmbedUrl = (s) => `https://www.instagram.com/${s.slice(3)}/embed`
export const igPostUrl = (s) => `https://www.instagram.com/${s.slice(3)}/`
export const photosOf = (images = []) => images.filter((i) => !isIg(i))
export const igOf = (images = []) => images.filter(isIg)
export const coverOf = (images = []) => photosOf(images)[0] ?? null

// Acepta un enlace y devuelve el texto a guardar, o lanza un error legible
export function parseImageLink(raw) {
  const url = raw.trim()
  if (!url) throw new Error('Pegá un enlace')
  const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]+)/i)
  if (m) return `ig:${m[1].toLowerCase() === 'tv' ? 'tv' : m[1].toLowerCase()}/${m[2]}`
  if (/instagram\.com/i.test(url)) throw new Error('Pegá el enlace de una publicación o reel de Instagram (…/p/XXXX o …/reel/XXXX)')
  if (!/^https?:\/\//i.test(url)) throw new Error('El enlace debe empezar con https://')
  return url
}
