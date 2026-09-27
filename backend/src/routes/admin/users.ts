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

// Los pedidos NO se borran con el cliente: Order.userId es opcional, así que la
// relación los deja en null y quedan como pedidos sin cuenta, con el nombre, el
// email y el teléfono que ya tienen guardados. Es a propósito: se va la cuenta,
// no el historial de ventas.
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, _count: { select: { orders: true } } },
    })
    if (!user) { res.status(404).json({ error: 'Cliente no encontrado' }); return }

    // Esta pantalla lista solo clientes, pero la ruta se puede llamar con
    // cualquier id: sin esto se podría borrar la cuenta de admin del comercio.
    if (user.role === 'ADMIN') {
      res.status(400).json({ error: 'No se puede eliminar una cuenta de administrador desde acá' })
      return
    }

    await prisma.user.delete({ where: { id: user.id } })
    res.json({ message: 'Cliente eliminado', ordersKept: user._count.orders })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el cliente' })
  }
})

export { router as adminUserRoutes }
