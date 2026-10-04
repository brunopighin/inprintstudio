import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Truck, Store, CreditCard, ArrowLeft } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { CARRIER_LABELS, ShippingQuote, Agency, PROVINCES, PaymentMethodConfig, TransferInfo } from '../types'
import api from '../services/api'
import WhatsAppIcon from '../components/icons/WhatsAppIcon'
import { WHATSAPP_NUMBER, formatWhatsApp, whatsappLink } from '../config'
import { isValidArgentinePhone } from '../utils/phone'

type Step = 'contact' | 'shipping' | 'payment' | 'confirm'
type ShippingMethod = 'pickup' | 'shipping'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (email: string) => EMAIL_RE.test(email.trim())

const formatPrice = (n: number) => `$${n.toLocaleString('es-AR')}`

// El mismo correo ofrece dos modalidades, así que la opción elegida se
// identifica por la combinación de las dos.
const quoteKey = (q: ShippingQuote) => `${q.carrier}:${q.deliveryType}`

// Correo devuelve más de 1300 sucursales en Buenos Aires, así que la lista se
// filtra en vez de volcarse entera en el select. Se ignoran acentos porque los
// nombres vienen sin ellos ("CIUDAD AUTONOMA") y el comprador los escribe.
const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const BRANCH_LIMIT = 200

interface CheckoutForm {
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingMethod: ShippingMethod
  shippingAddress: string
  locality: string
  province: string
  postalCode: string
  deliveryReference: string
  paymentMethod: string
  notes: string
}

const PAYMENT_METHOD_DESCRIPTIONS: Record<string, string> = {
  mercadopago: 'Tarjeta de crédito, débito, dinero en cuenta',
  transfer: 'Pagás y enviás el comprobante por WhatsApp',
}

function getShippingErrors(form: CheckoutForm) {
  const errors: Partial<Record<keyof CheckoutForm, string>> = {}
  if (form.shippingMethod === 'shipping') {
    if (!form.shippingAddress.trim()) errors.shippingAddress = 'La dirección es obligatoria'
    if (!form.locality.trim()) errors.locality = 'La localidad es obligatoria'
    if (!form.province.trim()) errors.province = 'La provincia es obligatoria'
    if (!form.postalCode.trim()) errors.postalCode = 'El código postal es obligatorio'
  }
  return errors
}

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('contact')
  const [loading, setLoading] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [shippingAttempted, setShippingAttempted] = useState(false)

  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [quoting, setQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const [agencies, setAgencies] = useState<Agency[]>([])
  const [agenciesLoading, setAgenciesLoading] = useState(false)
  const [agenciesError, setAgenciesError] = useState('')
  const [branchCode, setBranchCode] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  // Si el comprador escribió la localidad o la provincia a mano, no se le
  // pisan con lo que diga el CP.
  const [localityTouched, setLocalityTouched] = useState(false)
  const [provinceTouched, setProvinceTouched] = useState(false)
  const [autofilled, setAutofilled] = useState(false)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([])
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null)

  const [form, setForm] = useState<CheckoutForm>({
    customerName: user?.name || '',
    customerEmail: user?.email || '',
    customerPhone: user?.phone || '',
    shippingMethod: 'shipping',
    shippingAddress: '',
    locality: '',
    province: '',
    postalCode: '',
    deliveryReference: '',
    paymentMethod: 'mercadopago',
    notes: '',
  })

  const update = (k: keyof CheckoutForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    setQuotes([])
    setSelectedOption(null)
    setQuoteError('')
  }, [form.postalCode])

  // Localidad y provincia salen del código postal. Se espera un momento para no
  // pegarle al backend en cada tecla, y si el CP no está en la tabla no se toca
  // nada: el comprador los completa a mano como siempre.
  useEffect(() => {
    const cp = form.postalCode.trim()
    if (!/^\d{4}$/.test(cp) || (localityTouched && provinceTouched)) { setAutofilled(false); return }
    let cancelled = false
    const timer = setTimeout(() => {
      api.get(`/orders/locality?postalCode=${cp}`)
        .then(({ data }) => {
          if (cancelled) return
          setForm(f => ({
            ...f,
            locality: localityTouched ? f.locality : data.locality,
            province: provinceTouched ? f.province : data.province,
          }))
          setAutofilled(true)
        })
        .catch(() => { if (!cancelled) setAutofilled(false) })
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [form.postalCode, localityTouched, provinceTouched])

  useEffect(() => {
    api.get('/payments/methods').then(({ data }) => {
      setPaymentMethods(data.methods)
      setTransferInfo(data.transfer)
      const enabledKeys = (data.methods as PaymentMethodConfig[]).filter(m => m.enabled).map(m => m.key)
      if (enabledKeys.length && !enabledKeys.includes(form.paymentMethod)) {
        update('paymentMethod', enabledKeys[0])
      }
    }).catch(() => setPaymentMethods([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const discount = 0
  const selectedQuote = quotes.find(q => quoteKey(q) === selectedOption) || null
  const needsBranch = selectedQuote?.deliveryType === 'S'
  const selectedBranch = agencies.find(a => a.code === branchCode) || null
  const filteredAgencies = branchFilter.trim()
    ? agencies.filter(a => normalize(`${a.name} ${a.city} ${a.address} ${a.postalCode}`).includes(normalize(branchFilter)))
    : agencies

  useEffect(() => {
    setBranchCode('')
    setAgenciesError('')
    if (!needsBranch || !form.province) { setAgencies([]); return }
    let cancelled = false
    setAgenciesLoading(true)
    api.get(`/orders/agencies?province=${form.province}`)
      .then(({ data }) => {
        if (cancelled) return
        setAgencies(data)
        // Arranca filtrado por la localidad que ya cargó, que es donde va a
        // buscar sucursal el 90% de las veces.
        setBranchFilter(form.locality.trim())
      })
      .catch(() => { if (!cancelled) { setAgencies([]); setAgenciesError('No pudimos cargar las sucursales. Probá de nuevo en unos minutos.') } })
      .finally(() => { if (!cancelled) setAgenciesLoading(false) })
    return () => { cancelled = true }
  }, [needsBranch, form.province])
  const shippingCost = form.shippingMethod === 'shipping' ? (selectedQuote?.price ?? 0) : 0
  const baseTotal = total - discount + shippingCost
  const selectedMethod = paymentMethods.find(m => m.key === form.paymentMethod)
  const paymentAdjustment = selectedMethod ? Math.round(baseTotal * (selectedMethod.adjustmentPercent / 100) * 100) / 100 : 0
  const grandTotal = baseTotal + paymentAdjustment
  const shippingErrors = getShippingErrors(form)
  const transferWhatsApp = transferInfo?.whatsapp?.trim() || WHATSAPP_NUMBER

  const fetchQuotes = async ({ auto = false } = {}) => {
    // El precio depende del código postal y del carrito, nada más, así que
    // cotizando solo alcanza con el CP: las opciones aparecen mientras el
    // comprador sigue completando la dirección. A mano sí se exige todo.
    if (auto) {
      if (!/^\d{4}$/.test(form.postalCode.trim())) return
    } else if (Object.keys(shippingErrors).length > 0) {
      setShippingAttempted(true)
      return
    }
    setQuoting(true)
    setQuoteError('')
    setQuotes([])
    setSelectedOption(null)
    try {
      const orderItems = items.map(i => ({ productId: i.product.id, variantId: i.variant?.id, quantity: i.quantity }))
      const { data } = await api.post('/orders/shipping-quote', { postalCode: form.postalCode, items: orderItems })
      if (!data.length) setQuoteError('No encontramos opciones de envío para ese código postal.')
      setQuotes(data)
      // Si Correo cotiza una sola modalidad para ese CP no hay nada que elegir.
      if (data.length === 1) setSelectedOption(quoteKey(data[0]))
    } catch {
      setQuoteError('No pudimos cotizar el envío. Probá de nuevo en unos minutos.')
    } finally {
      setQuoting(false)
    }
  }

  // Las opciones de domicilio y sucursal aparecen solas en cuanto hay un CP
  // válido: antes quedaban escondidas detrás del botón "Cotizar envío" y el
  // comprador no llegaba a elegir.
  const cartKey = items.map(i => `${i.product.id}:${i.variant?.id ?? ''}:${i.quantity}`).join('|')
  useEffect(() => {
    if (form.shippingMethod !== 'shipping') return
    if (!/^\d{4}$/.test(form.postalCode.trim())) return
    const timer = setTimeout(() => { fetchQuotes({ auto: true }) }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shippingMethod, form.postalCode, cartKey])

  const shippingIncomplete = form.shippingMethod === 'shipping' && (!selectedQuote || (needsBranch && !branchCode))

  const handleContinueShipping = () => {
    setShippingAttempted(true)
    if (Object.keys(shippingErrors).length > 0) return
    if (shippingIncomplete) return
    setStep('payment')
  }

  const handleSubmit = async () => {
    if (loading) return
    if (Object.keys(shippingErrors).length > 0 || shippingIncomplete) {
      setShippingAttempted(true)
      setStep('shipping')
      return
    }

    setLoading(true)
    setError('')
    try {
      const orderItems = items.map(i => ({
        productId: i.product.id,
        variantId: i.variant?.id,
        quantity: i.quantity,
        photoUrls: i.photoUrls,
      }))
      const { data } = await api.post('/orders', {
        ...form,
        shippingCarrier: form.shippingMethod === 'shipping' ? selectedQuote?.carrier : undefined,
        shippingDeliveryType: form.shippingMethod === 'shipping' ? selectedQuote?.deliveryType : undefined,
        shippingBranchCode: needsBranch ? branchCode : undefined,
        items: orderItems,
      })

      if (form.paymentMethod === 'mercadopago' && data.checkoutUrl) {
        clearCart()
        window.location.href = data.checkoutUrl
        return
      }

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
        {form.shippingMethod === 'shipping' && (
          <div className="bg-gray-50 border border-gray-200 p-5 mb-8 text-left text-sm text-gray-600">
            <p className="font-bold mb-1 text-black">
              {selectedQuote ? `${CARRIER_LABELS[selectedQuote.carrier]} — ${selectedQuote.label}` : 'Envío'}
            </p>
            {selectedQuote?.deliveryType === 'S' && selectedBranch && (
              <p className="mb-1">Retirás en: <strong>{selectedBranch.name}</strong>{selectedBranch.address ? `, ${selectedBranch.address}` : ''}{selectedBranch.city ? `, ${selectedBranch.city}` : ''}</p>
            )}
            <p>Te vamos a avisar por email cuando el pedido esté {selectedQuote?.deliveryType === 'S' ? 'listo para retirar' : 'en camino'}.</p>
          </div>
        )}
        {form.paymentMethod === 'transfer' && transferInfo && (
          <div className="bg-gray-50 border border-gray-200 p-5 mb-8 text-left">
            <p className="font-bold mb-3">Datos para transferencia</p>
            <div className="space-y-1 text-sm text-gray-600">
              {transferInfo.bank && <p>Banco: {transferInfo.bank}</p>}
              {transferInfo.cbu && <p>CBU: {transferInfo.cbu}</p>}
              {transferInfo.alias && <p>Alias: {transferInfo.alias}</p>}
              {transferInfo.cuit && <p>CUIT/CUIL: {transferInfo.cuit}</p>}
              {transferInfo.holder && <p>Titular: {transferInfo.holder}</p>}
              <p className="mt-3 text-xs text-gray-400">{transferInfo.note || 'Enviá el comprobante al WhatsApp y confirmamos tu pedido.'}</p>
            </div>
            {transferWhatsApp && (
              <a
                href={whatsappLink(transferWhatsApp, `Hola! Te envío el comprobante de la transferencia del pedido ${orderNumber}.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white py-3 font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                <WhatsAppIcon size={16} />
                Enviar comprobante al {formatWhatsApp(transferWhatsApp)}
              </a>
            )}
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
                      {form.customerEmail && !isValidEmail(form.customerEmail) && (
                        <p className="text-red-600 text-xs mt-1">Ingresá un email válido</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Teléfono / WhatsApp *</label>
                      <input className="input-base" value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} placeholder="Ej: 221 412-3456" />
                      {form.customerPhone.trim() && !isValidArgentinePhone(form.customerPhone) && (
                        <p className="text-red-600 text-xs mt-1">Ingresá un teléfono válido: código de área y número, sin el 0 ni el 15. Ej: 221 412-3456</p>
                      )}
                    </div>
                    <button
                      onClick={() => setStep('shipping')}
                      disabled={!form.customerName.trim() || !isValidEmail(form.customerEmail) || !isValidArgentinePhone(form.customerPhone)}
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
                      { key: 'shipping' as const, icon: Truck, label: 'Envío por correo', desc: 'A tu domicilio o a una sucursal de Correo Argentino: elegís abajo' },
                      { key: 'pickup' as const, icon: Store, label: 'Retiro en local', desc: 'Gratis · Coordinamos el lugar y horario por WhatsApp' },
                    ].map(opt => (
                      <label key={opt.key} className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${form.shippingMethod === opt.key ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}>
                        <input type="radio" name="shipping" value={opt.key} checked={form.shippingMethod === opt.key} onChange={() => update('shippingMethod', opt.key)} className="sr-only" />
                        <opt.icon size={20} className={form.shippingMethod === opt.key ? 'text-black' : 'text-gray-400'} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                        <span className="font-bold text-sm">{opt.key === 'pickup' ? 'Gratis' : 'Según destino'}</span>
                      </label>
                    ))}
                  </div>

                  {form.shippingMethod === 'shipping' && (
                    <>
                      <div className="mt-5 space-y-4">
                        <div>
                          <label className="label">Dirección *</label>
                          <input className="input-base" value={form.shippingAddress} onChange={e => update('shippingAddress', e.target.value)} placeholder="Calle, número, piso, depto" />
                          {shippingAttempted && shippingErrors.shippingAddress && <p className="text-red-600 text-xs mt-1">{shippingErrors.shippingAddress}</p>}
                        </div>
                        <div>
                          <label className="label">Código postal *</label>
                          <input className="input-base max-w-[180px]" value={form.postalCode} onChange={e => update('postalCode', e.target.value)} placeholder="Ej: 1900" />
                          {autofilled && <p className="text-xs text-gray-400 mt-1">Completamos localidad y provincia según el código postal. Si no coincide, corregilas.</p>}
                          {shippingAttempted && shippingErrors.postalCode && <p className="text-red-600 text-xs mt-1">{shippingErrors.postalCode}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Localidad *</label>
                            <input className="input-base" value={form.locality} onChange={e => { setLocalityTouched(true); update('locality', e.target.value) }} placeholder="Ej: La Plata" />
                            {shippingAttempted && shippingErrors.locality && <p className="text-red-600 text-xs mt-1">{shippingErrors.locality}</p>}
                          </div>
                          <div>
                            <label className="label">Provincia *</label>
                            <select className="input-base" value={form.province} onChange={e => { setProvinceTouched(true); update('province', e.target.value) }}>
                              <option value="">Seleccioná una provincia</option>
                              {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                            </select>
                            {shippingAttempted && shippingErrors.province && <p className="text-red-600 text-xs mt-1">{shippingErrors.province}</p>}
                          </div>
                        </div>
                        <div>
                          <label className="label">Referencia de entrega (opcional)</label>
                          <input className="input-base" value={form.deliveryReference} onChange={e => update('deliveryReference', e.target.value)} placeholder="Entre calles, color de puerta, horario, etc." />
                        </div>

                        <div>
                          <button type="button" onClick={() => fetchQuotes()} disabled={quoting} className="btn-secondary w-full sm:w-auto disabled:opacity-50">
                            {quoting ? 'Cotizando envío…' : quotes.length > 0 ? 'Volver a cotizar' : 'Cotizar envío'}
                          </button>
                          {quoteError && <p className="text-red-600 text-xs mt-2">{quoteError}</p>}
                          {quotes.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="label mb-1">¿Cómo querés recibirlo? *</p>
                              {quotes.map(q => (
                                <label key={quoteKey(q)} className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors ${selectedOption === quoteKey(q) ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}>
                                  <input type="radio" name="shippingOption" className="sr-only" checked={selectedOption === quoteKey(q)} onChange={() => setSelectedOption(quoteKey(q))} />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold">{CARRIER_LABELS[q.carrier]} — {q.label}</p>
                                    {q.deliveryType === 'S' && <p className="text-xs text-gray-500">Retirás el pedido en la sucursal que elijas</p>}
                                    {(q.etaDaysMin || q.etaDaysMax) && (
                                      <p className="text-xs text-gray-500">
                                        Entrega estimada: {q.etaDaysMin && q.etaDaysMax && q.etaDaysMin !== q.etaDaysMax
                                          ? `${q.etaDaysMin}–${q.etaDaysMax}`
                                          : q.etaDaysMin || q.etaDaysMax} días hábiles
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-bold text-sm">{formatPrice(q.price)}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {needsBranch && (
                            <div className="mt-4">
                              <label className="label">Sucursal donde retirás *</label>
                              {agenciesLoading ? (
                                <p className="text-sm text-gray-400">Buscando sucursales…</p>
                              ) : agenciesError ? (
                                <p className="text-red-600 text-xs">{agenciesError}</p>
                              ) : agencies.length === 0 ? (
                                <p className="text-sm text-gray-500">No encontramos sucursales en esa provincia. Elegí envío a domicilio.</p>
                              ) : (
                                <div className="space-y-2">
                                  <input
                                    className="input-base py-2 text-sm"
                                    value={branchFilter}
                                    onChange={e => setBranchFilter(e.target.value)}
                                    placeholder="Filtrar por localidad, nombre o código postal"
                                  />
                                  {filteredAgencies.length === 0 ? (
                                    <p className="text-sm text-gray-500">Ninguna sucursal coincide con «{branchFilter}». Borrá el filtro para ver todas.</p>
                                  ) : (
                                    <>
                                      <select className="input-base" value={branchCode} onChange={e => setBranchCode(e.target.value)}>
                                        <option value="">Seleccioná una sucursal</option>
                                        {filteredAgencies.slice(0, BRANCH_LIMIT).map(a => (
                                          <option key={a.code} value={a.code}>
                                            {a.name}{a.city ? ` — ${a.city}` : ''}{a.address ? ` (${a.address})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                      <p className="text-xs text-gray-400">
                                        {filteredAgencies.length > BRANCH_LIMIT
                                          ? `Mostrando ${BRANCH_LIMIT} de ${filteredAgencies.length} sucursales. Afiná el filtro para ver el resto.`
                                          : `${filteredAgencies.length} ${filteredAgencies.length === 1 ? 'sucursal' : 'sucursales'}`}
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}
                              {shippingAttempted && !branchCode && filteredAgencies.length > 0 && (
                                <p className="text-red-600 text-xs mt-1">Elegí la sucursal donde querés retirar el pedido</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-5">
                    <label className="label">Notas adicionales (opcional)</label>
                    <textarea className="input-base resize-none" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Instrucciones especiales, diseño personalizado, etc." />
                  </div>

                  <button
                    onClick={handleContinueShipping}
                    disabled={shippingIncomplete}
                    className="btn-primary w-full mt-6 disabled:opacity-50"
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
                    {paymentMethods.length === 0 && (
                      <p className="text-sm text-gray-400">Cargando medios de pago…</p>
                    )}
                    {paymentMethods.filter(m => m.enabled).map(opt => (
                      <label key={opt.key} className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-colors ${form.paymentMethod === opt.key ? 'border-black' : 'border-gray-200 hover:border-gray-400'}`}>
                        <input type="radio" name="payment" value={opt.key} checked={form.paymentMethod === opt.key} onChange={() => update('paymentMethod', opt.key)} className="sr-only" />
                        <CreditCard size={20} className={form.paymentMethod === opt.key ? 'text-black' : 'text-gray-400'} />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-gray-500">{PAYMENT_METHOD_DESCRIPTIONS[opt.key] || ''}</p>
                        </div>
                        {opt.adjustmentPercent !== 0 && (
                          <span className={`text-xs font-bold ${opt.adjustmentPercent > 0 ? 'text-gray-500' : 'text-green-600'}`}>
                            {opt.adjustmentPercent > 0 ? '+' : ''}{opt.adjustmentPercent}%
                          </span>
                        )}
                        {form.paymentMethod === opt.key && <Check size={16} className="text-black" />}
                      </label>
                    ))}
                  </div>

                  {error && <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 p-3">{error}</p>}

                  <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full py-4">
                    {loading
                      ? 'Procesando pedido…'
                      : form.paymentMethod === 'mercadopago'
                        ? `Ir a pagar con MercadoPago · ${formatPrice(grandTotal)}`
                        : `Confirmar pedido · ${formatPrice(grandTotal)}`}
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
                        {item.photoUrls.length > 0 && (
                          <p className="text-xs text-gray-400">📷 {item.photoUrls.length === 1 ? '1 foto' : `${item.photoUrls.length} fotos`}</p>
                        )}
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
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Descuento</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Envío</span>
                  <span>{form.shippingMethod === 'pickup' ? 'Gratis' : selectedQuote ? formatPrice(shippingCost) : 'A cotizar'}</span>
                </div>
                {step === 'payment' && paymentAdjustment !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{paymentAdjustment > 0 ? 'Recargo' : 'Descuento'} por medio de pago</span>
                    <span>{paymentAdjustment > 0 ? '+' : '-'}{formatPrice(Math.abs(paymentAdjustment))}</span>
                  </div>
                )}
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
