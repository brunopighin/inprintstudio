// Número de contacto del sitio, en un solo lugar: estaba repetido en el footer
// y en Contacto, y el checkout lo necesita como respaldo cuando el admin no
// cargó un WhatsApp propio para los comprobantes de transferencia.
const RAW = import.meta.env.VITE_WHATSAPP_NUMBER || '5492323618591'

// Solo dígitos, que es lo que acepta wa.me.
export const WHATSAPP_NUMBER = RAW.replace(/\D/g, '')

// "5492323618591" -> "+54 9 2323 61-8591"
export function formatWhatsApp(digits: string) {
  const d = (digits || '').replace(/\D/g, '')
  const m = /^(\d{2})(\d)(\d{4})(\d{2})(\d{4})$/.exec(d)
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}-${m[5]}` : (digits || '')
}

export const whatsappLink = (digits: string, message?: string) =>
  `https://wa.me/${(digits || '').replace(/\D/g, '')}` +
  (message ? `?text=${encodeURIComponent(message)}` : '')
