import { Link, useSearchParams } from 'react-router-dom'
import { Check, Clock, X } from 'lucide-react'

const CONTENT = {
  success: {
    icon: Check,
    iconClass: 'bg-black',
    title: '¡Pago aprobado!',
    text: 'Tu pago fue acreditado y el pedido pasó a producción.',
  },
  pending: {
    icon: Clock,
    iconClass: 'bg-gray-400',
    title: 'Pago en proceso',
    text: 'Estamos esperando la confirmación de MercadoPago. Te avisamos por email apenas se acredite.',
  },
  failure: {
    icon: X,
    iconClass: 'bg-red-500',
    title: 'No pudimos procesar el pago',
    text: 'El pago fue rechazado o cancelado. Podés volver al carrito e intentar de nuevo.',
  },
}

export default function CheckoutResult() {
  const [params] = useSearchParams()
  const estado = (params.get('estado') as keyof typeof CONTENT) || 'pending'
  const pedido = params.get('pedido')
  const content = CONTENT[estado] || CONTENT.pending

  return (
    <div className="container-main py-24 max-w-lg mx-auto text-center">
      <div className={`w-16 h-16 ${content.iconClass} rounded-full flex items-center justify-center mx-auto mb-6`}>
        <content.icon size={28} className="text-white" />
      </div>
      <h1 className="text-3xl font-black mb-3">{content.title}</h1>
      <p className="text-gray-500 mb-4">{content.text}</p>
      {pedido && (
        <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Número de pedido</p>
          <p className="text-2xl font-black">{pedido}</p>
        </div>
      )}
      <div className="flex gap-3 justify-center">
        {estado === 'failure' ? (
          <Link to="/checkout" className="btn-primary">Volver a intentar</Link>
        ) : (
          <Link to="/mi-cuenta" className="btn-primary">Ver mis pedidos</Link>
        )}
        <Link to="/" className="btn-secondary">Ir al inicio</Link>
      </div>
    </div>
  )
}
