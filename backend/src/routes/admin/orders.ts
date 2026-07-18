import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

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

export { router as adminOrderRoutes }
