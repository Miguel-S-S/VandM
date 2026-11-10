import { useSettings } from '../lib/settings'

const ICONS = {
  instagram: { label: 'Instagram', d: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5ZM17.3 5.8a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z' },
  facebook: { label: 'Facebook', d: 'M13.5 22v-8h2.7l.5-3.2h-3.2V8.7c0-.9.3-1.6 1.7-1.6h1.6V4.2A21 21 0 0 0 14.4 4c-2.4 0-4 1.5-4 4.1v2.7H7.7V14h2.7v8h3.1Z' },
  tiktok: { label: 'TikTok', d: 'M16.6 2h-3.2v13.2a2.9 2.9 0 1 1-2-2.8V9.1a6.1 6.1 0 1 0 5.2 6V8.4a7.3 7.3 0 0 0 4.3 1.4V6.6a4.2 4.2 0 0 1-4.3-4.6Z' },
  youtube: { label: 'YouTube', d: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3Z' }
}

export default function Socials() {
  const { settings } = useSettings()
  const links = Object.entries(settings.social).filter(([, url]) => url)
  const wa = settings.whatsapp && `https://wa.me/${settings.whatsapp}`
  return (
    <div className="socials">
      {links.map(([k, url]) => (
        <a key={k} href={url} target="_blank" rel="noreferrer" aria-label={ICONS[k]?.label ?? k} title={ICONS[k]?.label}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d={ICONS[k]?.d} /></svg>
        </a>
      ))}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-3 11.5c-.3.8-1.500 1.500-2.200 1.500-3 0-6.300-3.200-6.300-6.200 0-.7.700-1.900 1.500-2.200l1.200 2.500-.8 1c.5 1 1.300 1.800 2.300 2.300l1-.8Z" /></svg>
        </a>
      )}
    </div>
  )
}
