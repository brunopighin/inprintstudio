import { useLocation } from 'react-router-dom'
import WhatsAppIcon from '../icons/WhatsAppIcon'
import { WHATSAPP_NUMBER, whatsappLink } from '../../config'

// Botón flotante para consultas. Va por debajo del carrito y de los modales (z-50),
// así no los tapa. En la página de un producto, el mensaje ya lleva el link para
// que se sepa por cuál consultan.
export default function WhatsAppButton() {
  const { pathname } = useLocation()
  // [nombre] queda marcado para que el cliente lo reemplace por el suyo
  const greeting = 'Hola, mi nombre es [nombre], quiero hacer una consulta'
  const message = pathname.startsWith('/producto/')
    ? `${greeting} sobre este producto: ${window.location.origin}${pathname}`
    : greeting

  return (
    <a
      href={whatsappLink(WHATSAPP_NUMBER, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultanos por WhatsApp"
      title="Consultanos por WhatsApp"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-105 hover:shadow-xl transition-transform"
    >
      <WhatsAppIcon size={30} />
    </a>
  )
}
