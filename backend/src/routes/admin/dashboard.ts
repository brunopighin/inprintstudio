import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

router.get('/stats', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalOrders, pendingOrders, totalUsers, totalProducts, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['RECEIVED', 'IN_PRODUCTION'] } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { active: true } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true } } },
      }),
    ])

    const totalRevenue = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { not: 'CANCELLED' } },
    })

    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    // Revenue last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentRevenue = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    })

    const dailyRevenue: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dailyRevenue[d.toLocaleDateString('es-AR')] = 0
    }
    recentRevenue.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString('es-AR')
      if (dailyRevenue[key] !== undefined) dailyRevenue[key] += o.total
    })

    res.json({
      totalOrders,
      pendingOrders,
      totalUsers,
      totalProducts,
      totalRevenue: totalRevenue._sum.total || 0,
      ordersByStatus,
      recentOrders,
      dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

export { router as adminDashboardRoutes }
