import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth'
import { preferenceClient } from '../utils/mercadopago'
import { Carrier, CARRIER_LABELS, computeOrderPhysicals } from '../utils/shipping'
import { getShippingQuotes } from '../utils/shippingProviders'
import { getAgencies, toProvinceCode, isConfigured as isCorreoArgentinoConfigured } from '../utils/shippingProviders/correoArgentino'
import { getPaymentMethod, calcAdjustment } from '../utils/paymentMethods'
import { isValidArgentinePhone } from '../utils/phone'
import postalCodes from '../data/postalCodes.json'
import { CUSTOMER_PHOTOS_SUBDIR } from './uploads'

const router = Router()
const prisma = new PrismaClient()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SHIPPING_METHODS = ['pickup', 'shipping'] as const
const DELIVERY_TYPES = ['D', 'S'] as const

function generateOrderNumber() {
  const date = new Date()
  const yy = date.getFullYear().toString().slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `IP-${yy}${mm}-${rand}`
}

interface CartItemInput {
  productId: string
  variantId?: string
  quantity: number
  photoUrl?: string
  photoUrls?: string[]
  notes?: string
}

const MAX_PHOTOS_PER_ITEM = 200

// Solo URLs de fotos subidas por /api/uploads/photo, no cualquier link externo
const cleanPhotoUrls = (urls: unknown): string[] =>
  Array.isArray(urls)
    ? urls
      .filter((u): u is string => typeof u === 'string' && u.includes(`/uploads/${CUSTOMER_PHOTOS_SUBDIR}/`))
      .slice(0, MAX_PHOTOS_PER_ITEM)
    : []

async function resolveItems(items: CartItemInput[]) {
  let subtotal = 0
  const physicalItems = []
  const orderItems = []
  const preferenceItems = []
  for (const item of items) {
    const variant = item.variantId
      ? await prisma.productVariant.findUnique({ where: { id: item.variantId } })
      : null
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product) continue
    const price = variant?.price ?? product.basePrice
    subtotal += price * item.quantity
    physicalItems.push({
      quantity: item.quantity,
      weightGrams: variant?.weightGrams ?? product.weightGrams,
      lengthCm: variant?.lengthCm ?? product.lengthCm,
      widthCm: variant?.widthCm ?? product.widthCm,
      heightCm: variant?.heightCm ?? product.heightCm,
    })
    orderItems.push({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      price,
      photoUrl: item.photoUrl || null,
      photoUrls: JSON.stringify(cleanPhotoUrls(item.photoUrls)),
      notes: item.notes || null,
    })
    preferenceItems.push({
      id: item.variantId || item.productId,
      title: variant ? `${product.name} (${variant.label})` : product.name,
      quantity: item.quantity,
      unit_price: price,
      currency_id: 'ARS',
    })
  }
  const { weightGrams, dimensionsCm } = computeOrderPhysicals(physicalItems)
  return { subtotal, weightGrams, dimensionsCm, orderItems, preferenceItems }
}

type PreferenceItem = ReturnType<typeof resolveItems> extends Promise<infer R>
  ? R extends { preferenceItems: (infer I)[] } ? I : never
  : never

// Refleja el recargo/descuento por medio de pago en lo que se le cobra al
// cliente en MercadoPago. Un recargo se suma como ítem aparte; un descuento
// se prorratea entre los ítems porque la API no acepta unit_price negativo.
function applyPaymentAdjustment(items: PreferenceItem[], adjustment: number): PreferenceItem[] {
  if (adjustment === 0) return items
  if (adjustment > 0) {
    return [...items, {
      id: 'payment-adjustment',
      title: 'Recargo por medio de pago',
      quantity: 1,
      unit_price: adjustment,
      currency_id: 'ARS',
    }]
  }
  const base = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0)
  if (base <= 0) return items
  const factor = Math.max(0, (base + adjustment) / base)
  return items.map(it => ({ ...it, unit_price: Math.round(it.unit_price * factor * 100) / 100 }))
}

router.post('/shipping-quote', async (req, res: Response) => {
  try {
    const { postalCode, items } = req.body
    if (!postalCode || !items?.length) {
      res.status(400).json({ error: 'Faltan datos para cotizar el envío' })
      return
    }

    const { subtotal, weightGrams, dimensionsCm } = await resolveItems(items)
    const quotes = await getShippingQuotes({
      postalCodeDestination: String(postalCode),
      weightGrams,
      dimensionsCm,
      declaredValue: subtotal,
    })
    res.json(quotes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cotizar el envío' })
  }
})

// Localidad y provincia a partir del código postal, para no hacérselas tipear.
// La tabla sale de las sucursales de Correo (ver scripts/buildPostalCodes.ts),
// así que cubre los CP con sucursal: el resto los completa el comprador a mano.
router.get('/locality', (req, res: Response) => {
  const cp = /(\d{4})/.exec(String(req.query.postalCode || ''))?.[1]
  const found = cp ? (postalCodes as Record<string, string[]>)[cp] : undefined
  if (!found) { res.status(404).json({ error: 'No tenemos la localidad de ese código postal' }); return }
  res.json({ postalCode: cp, locality: found[0], province: found[1] })
})

// Las sucursales también se listan en /admin/orders/agencies, pero esa pide
// token de admin y acá las necesita el comprador para elegir dónde retirar.
router.get('/agencies', async (req, res: Response) => {
  try {
    if (!(await isCorreoArgentinoConfigured())) { res.status(400).json({ error: 'No hay sucursales disponibles' }); return }
    const province = toProvinceCode(String(req.query.province || ''))
    if (!province) { res.status(400).json({ error: 'Provincia inválida' }); return }
    res.json(await getAgencies(province))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'No pudimos obtener las sucursales. Probá de nuevo en unos minutos.' })
  }
})

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName, customerEmail, customerPhone, items, shippingMethod, shippingCarrier, paymentMethod,
      shippingAddress, locality, province, postalCode, deliveryReference, notes,
      shippingDeliveryType, shippingBranchCode,
    } = req.body

    if (!customerName || !customerEmail || !items?.length) {
      res.status(400).json({ error: 'Datos incompletos' })
      return
    }

    if (!EMAIL_RE.test(String(customerEmail).trim())) {
      res.status(400).json({ error: 'Email inválido' })
      return
    }

    // El teléfono es con el que se lo contacta y el que va a Correo al generar
    // el envío, así que se valida acá también: el checkout se puede saltear.
    if (customerPhone && !isValidArgentinePhone(String(customerPhone))) {
      res.status(400).json({ error: 'Ingresá un teléfono válido: código de área y número, sin el 0 ni el 15' })
      return
    }

    if (!SHIPPING_METHODS.includes(shippingMethod)) {
      res.status(400).json({ error: 'Modalidad de entrega inválida' })
      return
    }

    if (shippingMethod === 'shipping') {
      if (!customerPhone || !shippingAddress || !locality || !province || !postalCode || !shippingCarrier) {
        res.status(400).json({ error: 'Faltan datos de entrega para el envío' })
        return
      }
      if (!DELIVERY_TYPES.includes(shippingDeliveryType)) {
        res.status(400).json({ error: 'Elegí si el envío es a domicilio o a sucursal' })
        return
      }
      // Sin sucursal elegida el envío no se puede generar después, y el pedido
      // quedaría cobrado como sucursal pero sin destino.
      if (shippingDeliveryType === 'S' && !String(shippingBranchCode || '').trim()) {
        res.status(400).json({ error: 'Elegí la sucursal donde querés retirar el pedido' })
        return
      }
    }

    const paymentMethodConfig = await getPaymentMethod(paymentMethod)
    if (!paymentMethodConfig || !paymentMethodConfig.enabled) {
      res.status(400).json({ error: 'El medio de pago elegido no está disponible' })
      return
    }

    const DISCOUNT = 0

    const { subtotal, weightGrams, dimensionsCm, orderItems, preferenceItems } = await resolveItems(items)

    let SHIPPING_COST = 0
    if (shippingMethod === 'shipping') {
      const quotes = await getShippingQuotes({
        postalCodeDestination: String(postalCode),
        weightGrams,
        dimensionsCm,
        declaredValue: subtotal,
      })
      // Se cobra la modalidad que eligió el comprador, no la primera que
      // devuelva el correo: entre domicilio y sucursal hay casi un 30%.
      const quote = quotes.find(q => q.carrier === shippingCarrier && q.deliveryType === shippingDeliveryType)
      if (!quote) {
        res.status(400).json({ error: 'La cotización de envío ya no está disponible, volvé a cotizar' })
        return
      }
      SHIPPING_COST = quote.price
      if (SHIPPING_COST > 0) {
        preferenceItems.push({
          id: 'shipping',
          title: `Envío — ${CARRIER_LABELS[shippingCarrier as Carrier] || shippingCarrier} ${quote.label}`,
          quantity: 1,
          unit_price: SHIPPING_COST,
          currency_id: 'ARS',
        })
      }
    }

    const totalBeforeAdjustment = subtotal - DISCOUNT + SHIPPING_COST
    const paymentAdjustment = calcAdjustment(totalBeforeAdjustment, paymentMethodConfig.adjustmentPercent)
    const total = totalBeforeAdjustment + paymentAdjustment

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user?.id || null,
        customerName,
        customerEmail,
        customerPhone,
        status: 'RECEIVED',
        subtotal,
        discount: DISCOUNT,
        shippingCost: SHIPPING_COST,
        paymentAdjustment,
        total,
        shippingMethod,
        shippingCarrier: shippingMethod === 'shipping' ? shippingCarrier : null,
        // La generación del envío deriva la modalidad de este campo
        // (routes/admin/orders.ts): con sucursal cargada va como 'S'.
        shippingBranchCode: shippingMethod === 'shipping' && shippingDeliveryType === 'S'
          ? String(shippingBranchCode).trim()
          : null,
        paymentMethod,
        shippingAddress: shippingAddress || null,
        locality: locality || null,
        province: province || null,
        postalCode: postalCode || null,
        deliveryReference: deliveryReference || null,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true, variant: true } } },
    })

    if (paymentMethod === 'mercadopago' && process.env.MP_ACCESS_TOKEN) {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5175').replace(/\/$/, '')
      const preference = await preferenceClient.create({
        body: {
          items: applyPaymentAdjustment(preferenceItems, paymentAdjustment),
          payer: { name: customerName, email: customerEmail },
          external_reference: order.id,
          back_urls: {
            success: `${frontendUrl}/checkout/resultado?estado=success&pedido=${order.orderNumber}`,
            failure: `${frontendUrl}/checkout/resultado?estado=failure&pedido=${order.orderNumber}`,
            pending: `${frontendUrl}/checkout/resultado?estado=pending&pedido=${order.orderNumber}`,
          },
          auto_return: 'approved',
          notification_url: `https://${req.get('host')}/api/payments/mercadopago/webhook`,
        },
      })
      await prisma.order.update({ where: { id: order.id }, data: { mpPreferenceId: preference.id } })
      res.status(201).json({
        ...order,
        checkoutUrl: preference.init_point || preference.sandbox_init_point,
      })
      return
    }

    res.status(201).json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear pedido' })
  }
})

router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: { include: { product: true, variant: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(orders)
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})

export { router as orderRoutes }
