// Datos de ejemplo para el modo demo (sin Supabase). Los precios son de muestra.
import { uid } from './format'

export const DEMO_CATEGORIES = [
  { slug: 'tobilleras', name: 'Tobilleras' },
  { slug: 'sandbags', name: 'Sandbags' },
  { slug: 'corebags', name: 'Corebags' },
  { slug: 'gusanos', name: 'Gusanos' }
]

export const weightVariants = (base, step, from = 1, to = 8, stock = 5) =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const kg = from + i
    return { id: uid(), label: `${kg} kg`, weight_kg: kg, price: Math.round(base + step * i), stock, active: true }
  })

export const DEMO_PRODUCTS = () => [
  {
    id: uid(), category: 'tobilleras', name: 'Tobilleras con peso',
    description: 'Tobilleras confeccionadas a mano, cargadas con arena y cierre ajustable. Ideales para trabajo de piernas, movilidad y funcional.',
    images: [], active: true, featured: true, variants: weightVariants(6500, 1500)
  },
  {
    id: uid(), category: 'sandbags', name: 'Sandbag',
    description: 'Bolsa de arena de lona resistente con asas reforzadas. Cargadas, lanzamientos, sentadillas y acarreos.',
    images: [], active: true, featured: true, variants: weightVariants(18000, 4000)
  },
  {
    id: uid(), category: 'corebags', name: 'Corebag',
    description: 'Corebag con asas para trabajo de core, rotaciones y movimientos dinámicos de crossfit.',
    images: [], active: true, featured: false, variants: weightVariants(16000, 3500)
  },
  {
    id: uid(), category: 'gusanos', name: 'Gusano',
    description: 'Gusano de arena (bolsa larga) para cargas, acarreos y ejercicios de estabilidad.',
    images: [], active: true, featured: false, variants: weightVariants(20000, 4500)
  }
]

export const DEFAULT_SETTINGS = {
  storeName: 'V&M Artículos Deportivos',
  tagline: 'Equipamiento hecho a mano para entrenar fuerte',
  whatsapp: '', // formato internacional sin "+": 5493794123456
  deliveryText: 'Entrega estimada: 5 a 7 días hábiles (se confeccionan a pedido)',
  social: {
    instagram: 'https://instagram.com/vandm.fitness.ctes',
    facebook: '',
    tiktok: '',
    youtube: ''
  },
  theme: {
    bg: '#000000',
    surface: '#141414',
    surface2: '#1f1f1f',
    border: '#333333',
    text: '#ffffff',
    muted: '#a3a3a3',
    accent: '#D97757',
    accentText: '#000000',
    danger: '#E02424',
    font: 'system',
    headingFont: 'oswald',
    radius: 14
  }
}

export const FONTS = {
  system: { label: 'Sistema', css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  inter: { label: 'Inter', css: "'Inter', system-ui, sans-serif", google: 'Inter:wght@400;500;600;700' },
  montserrat: { label: 'Montserrat', css: "'Montserrat', system-ui, sans-serif", google: 'Montserrat:wght@400;500;600;700;800' },
  oswald: { label: 'Oswald (deportiva)', css: "'Oswald', Impact, sans-serif", google: 'Oswald:wght@400;500;600;700' },
  bebas: { label: 'Bebas Neue', css: "'Bebas Neue', Impact, sans-serif", google: 'Bebas+Neue' },
  poppins: { label: 'Poppins', css: "'Poppins', system-ui, sans-serif", google: 'Poppins:wght@400;500;600;700' }
}

export const ACTIVITIES = [
  { id: 1, title: 'Caminata con tobilleras', category: 'tobilleras', level: 'Principiante', minutes: 20,
    desc: 'Caminata o trote suave sumando 1–2 kg por tobillo para activar glúteos y cuádriceps.', recommend: 'Tobilleras de 1 a 3 kg' },
  { id: 2, title: 'Elevaciones de pierna', category: 'tobilleras', level: 'Principiante', minutes: 15,
    desc: 'Series laterales, frontales y traseras de pierna para tonificar y mejorar la movilidad de cadera.', recommend: 'Tobilleras de 2 a 4 kg' },
  { id: 3, title: 'Sentadilla con sandbag', category: 'sandbags', level: 'Intermedio', minutes: 25,
    desc: 'Sentadillas frontales abrazando la bolsa; la carga inestable obliga a trabajar el core.', recommend: 'Sandbag de 8 a 20 kg' },
  { id: 4, title: 'Lanzamientos y cargadas', category: 'sandbags', level: 'Avanzado', minutes: 30,
    desc: 'Clean, lanzamientos por encima de la cabeza y cargadas al hombro estilo crossfit.', recommend: 'Sandbag de 15 kg o más' },
  { id: 5, title: 'Rotaciones de core', category: 'corebags', level: 'Intermedio', minutes: 20,
    desc: 'Giros rusos y tajos diagonales con corebag para potencia rotacional.', recommend: 'Corebag de 5 a 10 kg' },
  { id: 6, title: 'Acarreos con gusano', category: 'gusanos', level: 'Intermedio', minutes: 20,
    desc: 'Acarreos al hombro, press y cargadas con la bolsa larga: fuerza total y estabilidad.', recommend: 'Gusano de 10 kg o más' }
]

export const NEWS = [
  { id: 1, date: '2026-11-15', tag: 'Evento', title: 'Competencia local de crossfit',
    body: 'Próximamente: cargá acá las noticias y eventos deportivos relacionados (esta sección se administrará desde el panel en la próxima etapa).' },
  { id: 2, date: '2026-11-30', tag: 'Evento', title: 'Torneo regional de fuerza funcional',
    body: 'Ejemplo de noticia. Podés editar el contenido real cuando habilitemos el ABM de noticias.' }
]
