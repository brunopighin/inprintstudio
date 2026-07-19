import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { optionalAuth, authenticate, AuthRequest } from '../middleware/auth'
import { calculateShippingCost, quoteShipping } from '../utils/shipping'

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
