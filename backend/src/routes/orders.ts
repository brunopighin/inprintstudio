import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth'
import { preferenceClient } from '../utils/mercadopago'
import { Carrier, CARRIER_LABELS, computeOrderPhysicals } from '../utils/shipping'
import { getShippingQuotes } from '../utils/shippingProviders'

const router = Router()
const prisma = new PrismaClient()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SHIPPING_METHODS = ['pickup', 'shipping'] as const

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
  notes?: string
}

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

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerName, customerEmail, customerPhone, items, shippingMethod, shippingCarrier, paymentMethod,
      shippingAddress, locality, province, postalCode, deliveryReference, notes,
    } = req.body

    if (!customerName || !customerEmail || !items?.length) {
      res.status(400).json({ error: 'Datos incompletos' })
      return
    }

    if (!EMAIL_RE.test(String(customerEmail).trim())) {
      res.status(400).json({ error: 'Email inválido' })
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
      const quote = quotes.find(q => q.carrier === shippingCarrier)
      if (!quote) {
        res.status(400).json({ error: 'La cotización de envío ya no está disponible, volvé a cotizar' })
        return
      }
      SHIPPING_COST = quote.price
      if (SHIPPING_COST > 0) {
        preferenceItems.push({
          id: 'shipping',
          title: `Envío (${CARRIER_LABELS[shippingCarrier as Carrier] || shippingCarrier})`,
          quantity: 1,
          unit_price: SHIPPING_COST,
          currency_id: 'ARS',
        })
      }
    }

    const total = subtotal - DISCOUNT + SHIPPING_COST

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
        total,
        shippingMethod,
        shippingCarrier: shippingMethod === 'shipping' ? shippingCarrier : null,
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
          items: preferenceItems,
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
