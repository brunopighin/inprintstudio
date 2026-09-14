import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'
import { CARRIERS, DEFAULT_PACKAGE_DIMENSIONS_CM } from '../../utils/shipping'
import { getAgencies, importShipment, buildShipmentAddress, toProvinceCode, isConfigured as isCorreoArgentinoConfigured } from '../../utils/shippingProviders/correoArgentino'

const router = Router()
const prisma = new PrismaClient()

router.get('/agencies', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isCorreoArgentinoConfigured()) { res.status(400).json({ error: 'Correo Argentino no está configurado' }); return }
    const province = toProvinceCode(String(req.query.province || ''))
    if (!province) { res.status(400).json({ error: 'Provincia inválida' }); return }
    const agencies = await getAgencies(province)
    res.json(agencies)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error al obtener sucursales' })
  }
})

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { customerName: { contains: search as string } },
        { customerEmail: { contains: search as string } },
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: true, variant: true } }, user: { select: { id: true, name: true, email: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ])
    res.json({ orders, total })
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})

router.get('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true, variant: true } }, user: true },
    })
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return }
    res.json(order)
  } catch {
    res.status(500).json({ error: 'Error al obtener pedido' })
  }
})

router.patch('/:id/status', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body
    const validStatuses = ['RECEIVED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' })
      return
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    })
    res.json(order)
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' })
  }
})

router.patch('/:id/tracking', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { trackingCarrier, trackingNumber } = req.body
    if (!CARRIERS.includes(trackingCarrier)) {
      res.status(400).json({ error: 'Correo inválido' })
      return
    }
    if (!trackingNumber || !String(trackingNumber).trim()) {
      res.status(400).json({ error: 'Número de seguimiento requerido' })
      return
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { trackingCarrier, trackingNumber: String(trackingNumber).trim() },
    })
    res.json(order)
  } catch {
    res.status(500).json({ error: 'Error al actualizar seguimiento' })
  }
})

router.patch('/:id/branch', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { branchCode } = req.body
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { shippingBranchCode: branchCode ? String(branchCode).trim() : null },
    })
    res.json(order)
  } catch {
    res.status(500).json({ error: 'Error al guardar la sucursal' })
  }
})

router.post('/:id/generate-shipment', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { variant: true } } },
    })
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return }
    if (order.shippingCarrier !== 'correo_argentino') {
      res.status(400).json({ error: 'La generación de envío solo está disponible para Correo Argentino' })
      return
    }
    if (!isCorreoArgentinoConfigured()) {
      res.status(400).json({ error: 'Correo Argentino no está configurado' })
      return
    }
    if (order.shipmentStatus === 'imported') {
      res.status(400).json({ error: 'El envío de este pedido ya fue generado' })
      return
    }
    if (!order.shippingAddress || !order.locality || !order.province || !order.postalCode) {
      res.status(400).json({ error: 'Faltan datos de dirección en el pedido' })
      return
    }

    const weightGrams = order.items.reduce((sum, item) => sum + (item.variant?.weightGrams ?? 500) * item.quantity, 0)

    try {
      await importShipment({
        extOrderId: order.orderNumber,
        orderNumber: order.orderNumber,
        recipientName: order.customerName,
        recipientEmail: order.customerEmail,
        recipientPhone: order.customerPhone || undefined,
        deliveryType: order.shippingBranchCode ? 'S' : 'D',
        branchCode: order.shippingBranchCode || undefined,
        address: buildShipmentAddress(order.shippingAddress, order.locality, order.province, order.postalCode),
        declaredValue: order.subtotal,
        weightGrams,
        dimensionsCm: DEFAULT_PACKAGE_DIMENSIONS_CM,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      const failed = await prisma.order.update({
        where: { id: order.id },
        data: { shipmentStatus: 'error', shipmentError: message },
      })
      res.status(502).json({ error: message, order: failed })
      return
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        shipmentStatus: 'imported',
        shipmentError: null,
        trackingCarrier: 'correo_argentino',
        trackingNumber: order.orderNumber,
      },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Error al generar el envío' })
  }
})

export { router as adminOrderRoutes }
