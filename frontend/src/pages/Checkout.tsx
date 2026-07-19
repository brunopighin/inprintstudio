import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Truck, Store, CreditCard, ArrowLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

type Step = 'contact' | 'shipping' | 'payment' | 'confirm'

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('contact')
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    customerName: user?.name || '',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    shippingMethod: 'pickup' as 'pickup' | 'shipping' | 'courier',
    shippingAddress: '',
    postalCode: '',
    paymentMethod: 'mercadopago' as 'mercadopago' | 'transfer',
    notes: '',
  })

  const [shippingQuote, setShippingQuote] = useState<{ zone: string; cost: number } | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  const update = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (form.shippingMethod === 'pickup') {
      setShippingQuote(null)
      setQuoteError('')
      return
    }
    const cp = form.postalCode.trim()
    if (cp.length < 4) {
      setShippingQuote(null)
      setQuoteError('')
      return
    }
    setQuoteLoading(true)
    setQuoteError('')
    const timeout = setTimeout(() => {
      api.get('/orders/shipping-quote', { params: { postalCode: cp } })
        .then(({ data }) => setShippingQuote(data))
        .catch(() => {
          setShippingQuote(null)
          setQuoteError('No pudimos calcular el envío para ese código postal')
        })
        .finally(() => setQuoteLoading(false))
    }, 500)
    return () => clearTimeout(timeout)
  }, [form.postalCode, form.shippingMethod])

  const shippingCost = form.shippingMethod === 'pickup' ? 0 : (shippingQuote?.cost ?? 0)
  const grandTotal = total + shippingCost

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const orderItems = items.map(i => ({
        productId: i.product.id,
        variantId: i.variant?.id,
        quantity: i.quantity,
        photoUrl: i.photoUrl,
      }))
      const { data } = await api.post('/orders', {
        ...form,
        items: orderItems,
      })
      setOrderNumber(data.orderNumber)
      clearCart()
      setStep('confirm')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al procesar el pedido'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (n: number) => `$${n.toLocaleString('es-AR')}`

  if (items.length === 0 && step !== 'confirm') {
    return (
      <div className="container-main py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
        <Link to="/catalogo" className="btn-primary">Ver catálogo</Link>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="container-main py-24 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-black mb-3">¡Pedido recibido!</h1>
        <p className="text-gray-500 mb-4">Tu pedido fue registrado correctamente.</p>
        <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Número de pedido</p>
          <p className="text-2xl font-black">{orderNumber}</p>
          <p className="text-sm text-gray-500 mt-2">Guardá este número como comprobante de tu pedido</p>
        </div>
        {form.paymentMethod === 'transfer' && (
          <div className="bg-gray-50 border border-gray-200 p-5 mb-8 text-left">
            <p className="font-bold mb-3">Datos para transferencia</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Banco: Banco Ejemplo</p>
              <p>CBU: 0000003100000000000000</p>
              <p>Alias: INPRINT.PAGOS</p>
              <p>CUIL: 20-12345678-9</p>
              <p className="mt-3 text-xs text-gray-400">Enviá el comprobante al WhatsApp o email y confirmamos tu pedido.</p>
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary">Ir al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        {/* Steps */}
        <div className="flex items-center gap-0 mb-10 max-w-2xl mx-auto">
          {[
            { key: 'contact', label: 'Contacto' },
            { key: 'shipping', label: 'Envío' },
            { key: 'payment', label: 'Pago' },
          ].map((s, idx) => {
            const steps: Step[] = ['contact', 'shipping', 'payment']
            const isActive = step === s.key
            const isDone = steps.indexOf(step) > idx
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-black text-black' : isDone ? 'border-gray-400 text-gray-400' : 'border-gray-200 text-gray-300'}`}>
                  <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ${isActive ? 'bg-black text-white' : isDone ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-300'}`}>
                    {isDone ? <Check size={12} /> : idx + 1}
                  </span>
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 p-6 md:p-8">
              {step === 'contact' && (
                <div>
                  <h2 className="font-bold text-xl mb-6">Datos de contacto</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Nombre completo *</label>
                      <input className="input-base" value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder="Tu nombre" />
                    </div>
                    <div>
                      <label className="label">Email *</label>
                      <input className="input-base" type="email" value={form.customerEmail} onChange={e => update('customerEmail', e.target.value)} placeholder="tu@email.com" />
                    </div>
                    <div>
                      <label className="label">Teléfono / WhatsApp</label>
                      <input className="input-base" value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} placeholder="+54 9 221 ..." />
                    </div>
                    <button
                      onClick={() => setStep('shipping')}
                      disabled={!form.customerName || !form.customerEmail}
                      className="btn-primary w-full mt-2"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {step === 'shipping' && (
                <div>
                  <button onClick={() => setStep('contact')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-black mb-6 transition-colors">
                    <ArrowLeft size={14} /> Volver
                  </button>
                  <h2 className="font-bold text-xl mb-6">Método de entrega</h2>
                  <div className="space-y-3">
                    {[
                      { key: 'pickup', icon: Store, label: 'Retiro en local', desc: 'Gratis · Av. Ejemplo 1234, La Plata' },
                      { key: 'shipping', icon: Truck, label: 'Envío a domicilio', desc: 'Andreani · 3-7 días hábiles' },
                      { key: 'courier', icon: Truck, label: 'Correo Argentino', desc: 'Para todo el interior del país' },
                    ].map(opt => (
                      <label key={opt.key} className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${form.shippingMethod === opt.key ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}>
                        <input type="radio" name="shipping" value={opt.key} checked={form.shippingMethod === opt.key as 'pickup' | 'shipping' | 'courier'} onChange={() => update('shippingMethod', opt.key)} className="sr-only" />
                        <opt.icon size={20} className={form.shippingMethod === opt.key ? 'text-black' : 'text-gray-400'} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                        <span className="font-bold text-sm">{opt.key === 'pickup' ? 'Gratis' : 'Según CP'}</span>
                      </label>
                    ))}
                  </div>

                  {form.shippingMethod !== 'pickup' && (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="label">Código postal *</label>
                        <input className="input-base max-w-[180px]" value={form.postalCode} onChange={e => update('postalCode', e.target.value)} placeholder="Ej: 1900" />
                        {quoteLoading && <p className="text-xs text-gray-400 mt-1">Calculando costo de envío...</p>}
                        {!quoteLoading && shippingQuote && (
                          <p className="text-xs text-gray-600 mt-1">Zona: {shippingQuote.zone} · Costo: {formatPrice(shippingQuote.cost)}</p>
                        )}
                        {!quoteLoading && quoteError && <p className="text-xs text-red-600 mt-1">{quoteError}</p>}
                      </div>
                      <div>
                        <label className="label">Dirección de envío *</label>
                        <textarea className="input-base resize-none" rows={3} value={form.shippingAddress} onChange={e => update('shippingAddress', e.target.value)} placeholder="Calle, número, piso, depto, ciudad, provincia" />
                      </div>
                    </div>
                  )}

                  <div className="mt-5">
                    <label className="label">Notas adicionales (opcional)</label>
                    <textarea className="input-base resize-none" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Instrucciones especiales, diseño personalizado, etc." />
                  </div>

                  <button
                    onClick={() => setStep('payment')}
                    disabled={form.shippingMethod !== 'pickup' && (!form.shippingAddress || !shippingQuote)}
                    className="btn-primary w-full mt-6"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {step === 'payment' && (
                <div>
                  <button onClick={() => setStep('shipping')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-black mb-6 transition-colors">
                    <ArrowLeft size={14} /> Volver
                  </button>
                  <h2 className="font-bold text-xl mb-6">Método de pago</h2>

                  <div className="space-y-3 mb-8">
                    {[
                      { key: 'mercadopago', label: 'MercadoPago', desc: 'Tarjeta de crédito, débito, dinero en cuenta' },
                      { key: 'transfer', label: 'Transferencia bancaria', desc: 'Pagás y enviás el comprobante por WhatsApp' },
                    ].map(opt => (
                      <label key={opt.key} className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${form.paymentMethod === opt.key ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}>
                        <input type="radio" name="payment" value={opt.key} checked={form.paymentMethod === opt.key as 'mercadopago' | 'transfer'} onChange={() => update('paymentMethod', opt.key)} className="sr-only" />
                        <CreditCard size={20} className={form.paymentMethod === opt.key ? 'text-black' : 'text-gray-400'} />
                        <div>
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                        {form.paymentMethod === opt.key && <Check size={16} className="ml-auto text-black" />}
                      </label>
                    ))}
                  </div>

                  {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 p-3">{error}</p>}

                  <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-4">
                    {loading ? 'Procesando...' : `Confirmar pedido · ${formatPrice(grandTotal)}`}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
                    Al confirmar aceptás los términos y condiciones del servicio.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 p-6 sticky top-24">
              <h3 className="font-bold mb-5">Resumen del pedido</h3>
              <div className="space-y-4 divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const price = item.variant?.price ?? item.product.basePrice
                  const images = JSON.parse(item.product.images || '[]')
                  return (
                    <div key={idx} className="flex gap-3 pt-4 first:pt-0">
                      <div className="w-14 h-14 bg-gray-100 flex-shrink-0 overflow-hidden">
                        <img src={images[0] || ''} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight">{item.product.name}</p>
                        {item.variant && <p className="text-xs text-gray-400">{item.variant.label}</p>}
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold flex-shrink-0">{formatPrice(price * item.quantity)}</p>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-gray-200 mt-5 pt-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío</span>
                  <span>
                    {form.shippingMethod === 'pickup'
                      ? 'Gratis'
                      : shippingQuote ? formatPrice(shippingCost) : 'A calcular'}
                  </span>
                </div>
                <div className="flex justify-between font-black text-lg pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
