import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth'
import { calculateShippingCost, quoteShipping } from '../utils/shipping'
import { preferenceClient } from '../utils/mercadopago'

const router = Router()
const prisma = new PrismaClient()

function generateOrderNumber() {
  const date = new Date()
  const yy = date.getFullYear().toString().slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `IP-${yy}${mm}-${rand}`
}

router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { customerName, customerEmail, customerPhone, items, shippingMethod, paymentMethod, shippingAddress, postalCode, notes } = req.body

    if (!customerName || !customerEmail || !items?.length) {
      res.status(400).json({ error: 'Datos incompletos' })
      return
    }

    const SHIPPING_COST = calculateShippingCost(shippingMethod, postalCode)

    let subtotal = 0
    const orderItems = []
    const preferenceItems = []
    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
      const product = await prisma.product.findUnique({ where: { id: item.productId } })
      if (!product) continue
      const price = variant?.price ?? product.basePrice
      subtotal += price * item.quantity
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

    const total = subtotal + SHIPPING_COST

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: req.user?.id || null,
        customerName,
        customerEmail,
        customerPhone,
        status: 'RECEIVED',
        subtotal,
        shippingCost: SHIPPING_COST,
        total,
        shippingMethod,
        paymentMethod,
        shippingAddress: shippingAddress || null,
        postalCode: postalCode || null,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: { include: { product: true, variant: true } } },
    })

    if (paymentMethod === 'mercadopago' && process.env.MP_ACCESS_TOKEN) {
      if (SHIPPING_COST > 0) {
        preferenceItems.push({ id: 'shipping', title: 'Envío', quantity: 1, unit_price: SHIPPING_COST, currency_id: 'ARS' })
      }
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5175').replace(/\/$/, '')
      const preference = await preferenceClient.create({
        body: {
          items: preferenceItems,
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
        checkoutUrl: preference.sandbox_init_point || preference.init_point,
      })
      return
    }

    res.status(201).json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear pedido' })
  }
})

router.get('/shipping-quote', async (req, res: Response) => {
  const postalCode = String(req.query.postalCode || '')
  const quote = quoteShipping(postalCode)
  if (!quote) {
    res.status(404).json({ error: 'Código postal no reconocido' })
    return
  }
  res.json(quote)
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
