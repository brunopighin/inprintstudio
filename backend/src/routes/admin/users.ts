import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where: Record<string, unknown> = { role: 'CUSTOMER' }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])
    res.json({ users, total })
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

router.get('/:id/orders', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(orders)
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos del usuario' })
  }
})

export { router as adminUserRoutes }
